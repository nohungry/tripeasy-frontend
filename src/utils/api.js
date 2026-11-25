import { userStore } from '@/stores/userStore.js';
import Swal from 'sweetalert2';
import axios from 'axios';
import router from '@/router';

const baseUrl = import.meta.env.VITE_API_BASE;
const version = 'v1';
const apiUrl = `${baseUrl}/api/${version}/auth/userinfo`;

const apiUrl_userprofile = `${baseUrl}/api/${version}/user/userinfo`;

const apiUrl_product = `${baseUrl}/api/${version}/user/product/search`;
const apiUrl_home = `${baseUrl}/api/${version}/user/home/search`;

const apiUrl_cart = `${baseUrl}/api/${version}/user/trade/cart`;
const apiUrl_discounts = `${baseUrl}/api/${version}/user/trade/discounts`;
const apiUrl_checkout = `${baseUrl}/api/${version}/user/checkout`;
const apiUrl_newebpay = `${baseUrl}/api/${version}/user/newebpay`;

// 401 統一處理：凡是「有帶 Authorization」的請求回 401，一律登出、標記 sessionExpired、
// 顯示「登入已過期」。排除 /login/status、/login/email、/login/google：
// router.beforeEach 在 login / register / forgotpw / resetpw 頁會帶（可能已過期的）token 打
// /login/status，requireAuth 也自己處理；若一律處理，重設密碼信的連結會被導回登入頁。
function isAuthExempt(url) {
  return [`${apiUrl}/login/status`, `${apiUrl}/login/email`, `${apiUrl}/login/google`].some((p) =>
    url.startsWith(p)
  );
}

// 會員 API：401 時除了提示，還要導回登入頁。商品的 GET（公開讀取）與 /eligibility
// （詳情頁載入時自動呼叫）不算，留在原頁（P3 spec §6.6）。
function isMemberApi(config) {
  const url = config?.url || '';
  return (
    url.startsWith(apiUrl_userprofile) ||
    url.startsWith(`${apiUrl}/resetprofilepw`) ||
    (url.startsWith(apiUrl_product) && config?.method === 'post') ||
    url.startsWith(apiUrl_cart) ||
    url.startsWith(apiUrl_discounts) ||
    url.startsWith(apiUrl_checkout) ||
    url.startsWith(apiUrl_newebpay)
  );
}

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (
      error.response?.status === 401 &&
      error.config?.headers?.Authorization &&
      !isAuthExempt(url)
    ) {
      userStore.logout();
      error.sessionExpired = true;
      Swal.fire({
        icon: 'warning',
        title: '登入已過期',
        text: '請重新登入',
        scrollbarPadding: false,
        timer: 2000,
        showConfirmButton: false,
      });
      if (isMemberApi(error.config)) {
        router.replace('/admin/login');
      }
    }
    return Promise.reject(error);
  }
);

// 公開讀取：有 token 才帶 Authorization（避免送出 Bearer null）。token 已過期時 interceptor 會
// 登出並標 sessionExpired，這裡不帶 token 再試一次，讓訪客仍看得到公開頁。
export async function withOptionalAuth(request) {
  const token = localStorage.getItem('authToken');
  try {
    return await request(token ? { Authorization: `Bearer ${token}` } : {});
  } catch (error) {
    if (token && error?.sessionExpired) {
      return await request({});
    }
    throw error;
  }
}

// [GET] 商品詳情：400／404 回 null
export async function get_tour_detail(tourId) {
  try {
    const res = await withOptionalAuth((headers) =>
      axios.get(`${apiUrl_product}/${encodeURIComponent(tourId)}`, { headers, params: { lang: 'zh-TW' } })
    );
    return res.data.data;
  } catch (error) {
    const status = error.response?.status;
    if (status === 400 || status === 404) return null;
    throw error;
  }
}

// [GET] 行程評論：沒有評論時回應沒有 data 鍵
export async function get_tour_reviews(tourId, page, limit) {
  const res = await withOptionalAuth((headers) =>
    axios.get(`${apiUrl_product}/${encodeURIComponent(tourId)}/reviews`, {
      headers,
      params: { page, limit, lang: 'zh-TW' },
    })
  );
  return res.data.data ?? { average_rating: 0, reviews: [] };
}

// [GET] 行程隱藏玩法：沒有資料時回應沒有 data 鍵
export async function get_tour_hidden_shares(tourId, page, limit) {
  const res = await withOptionalAuth((headers) =>
    axios.get(`${apiUrl_product}/${encodeURIComponent(tourId)}/hidden-shares`, {
      headers,
      params: { page, limit, lang: 'zh-TW' },
    })
  );
  return res.data.data ?? [];
}

// [GET] 寫入資格：沒有 token 不發請求；403（admin）與 401（過期）都當作不能寫，不導頁
export async function get_tour_eligibility(tourId) {
  const none = { can_write: false, has_reviewed: false };
  const token = localStorage.getItem('authToken');
  if (!token) return none;
  try {
    const res = await axios.get(`${apiUrl_product}/${encodeURIComponent(tourId)}/eligibility`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data ?? none;
  } catch (error) {
    if (error?.sessionExpired || error.response?.status === 403) return none;
    throw error;
  }
}

async function postTourWrite(path, tourId, body) {
  try {
    const res = await axios.post(`${apiUrl_product}/${encodeURIComponent(tourId)}/${path}`, body, {
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
    });
    return res.data.data;
  } catch (error) {
    if (error?.sessionExpired) {
      throw error; // 401 已由 interceptor 提示並導頁，不再跳自己的錯誤框
    }
    const data = error.response?.data;
    Swal.fire({
      icon: 'error',
      title: data?.status || '網路錯誤',
      text: data?.message || '無法連線到伺服器，請檢查網路後再試一次。',
      scrollbarPadding: false,
    });
    throw error;
  }
}

// [POST] 寫評論
export function post_tour_review(tourId, { rating, content }) {
  return postTourWrite('reviews', tourId, { rating, content });
}

// [POST] 分享隱藏玩法：url 為空字串時不送此鍵
export function post_tour_hidden_share(tourId, { title, content, url }) {
  const body = { title, content };
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (trimmed !== '') body.url = trimmed;
  return postTourWrite('hidden-shares', tourId, body);
}

// [GET] 首頁購物專區：type（tourgroup／backpacker）、item、page、limit
export async function get_home_products({ type, item, page, limit }) {
  const res = await withOptionalAuth((headers) =>
    axios.get(`${apiUrl_home}/products`, {
      headers,
      params: { type, item, page, limit, lang: 'zh-TW' },
    })
  );
  return res.data.data ?? [];
}

// [GET] 搜尋頁清單：值為 ''、null、undefined 的鍵不送
export async function get_tour_list(query) {
  const params = { lang: 'zh-TW' };
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== '' && value !== null && value !== undefined) params[key] = value;
  }
  const res = await withOptionalAuth((headers) => axios.get(apiUrl_product, { headers, params }));
  return res.data.data ?? [];
}

// ---------- P4 交易：購物車、結帳、付款 ----------

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('authToken')}` };
}

// 錯誤處理同 postTourWrite：401（sessionExpired）直接 rethrow；其他顯示後端 message 的錯誤框再 rethrow
async function tradeRequest(request) {
  try {
    return await request();
  } catch (error) {
    if (error?.sessionExpired) throw error;
    const data = error.response?.data;
    Swal.fire({
      icon: 'error',
      title: data?.status || '網路錯誤',
      text: data?.message || '無法連線到伺服器，請檢查網路後再試一次。',
      scrollbarPadding: false,
    });
    throw error;
  }
}

// [POST] 加入購物車
export async function post_cart_item(tourId, { type, item, people, options }) {
  await tradeRequest(() =>
    axios.post(`${apiUrl_cart}/${encodeURIComponent(tourId)}`, { type, item, people, options }, { headers: authHeaders() })
  );
}

// [PATCH] 修改購物車項目
export async function patch_cart_item(cartItemId, { type, item, people, options }) {
  await tradeRequest(() =>
    axios.patch(`${apiUrl_cart}/${encodeURIComponent(cartItemId)}`, { type, item, people, options }, { headers: authHeaders() })
  );
}

// [DELETE] 移除購物車項目
export async function delete_cart_item(cartItemId) {
  await tradeRequest(() =>
    axios.delete(`${apiUrl_cart}/${encodeURIComponent(cartItemId)}`, { headers: authHeaders() })
  );
}

// [GET] 購物車清單：沒有資料時回應沒有 data 鍵。後端 limit 沒有上限，預設 50 足以涵蓋一般購物車
export async function get_cart_list({ page = 1, limit = 50 } = {}) {
  const res = await tradeRequest(() =>
    axios.get(`${apiUrl_cart}/list`, { headers: authHeaders(), params: { page, limit, lang: 'zh-TW' } })
  );
  return res.data.data ?? { data: [], summary: { total_items: 0, total_price: 0 } };
}

// [POST] 以購物車建立訂單
export async function post_order(cartId) {
  const res = await tradeRequest(() =>
    axios.post(`${apiUrl_checkout}/order/${encodeURIComponent(cartId)}`, {}, { headers: authHeaders() })
  );
  return res.data.data;
}

// [GET] 結帳頁會員資料
export async function get_checkout_userinfo(orderId) {
  const res = await tradeRequest(() =>
    axios.get(`${apiUrl_checkout}/userinfo/${encodeURIComponent(orderId)}`, { headers: authHeaders() })
  );
  return res.data.data;
}

// [PATCH] 結帳預覽（寫入聯絡資料、付款方式、折扣）
export async function patch_checkout_preview(orderId, body) {
  const res = await tradeRequest(() =>
    axios.patch(`${apiUrl_checkout}/preview/${encodeURIComponent(orderId)}`, body, { headers: authHeaders() })
  );
  return res.data.data;
}

// [GET] 結帳摘要
export async function get_checkout_summary(orderId) {
  const res = await tradeRequest(() =>
    axios.get(`${apiUrl_checkout}/summary/${encodeURIComponent(orderId)}`, { headers: authHeaders() })
  );
  return res.data.data;
}

// [POST] 試算優惠券或點數折抵
export async function post_discount_trial(orderId, { type, discount }) {
  const res = await tradeRequest(() =>
    axios.post(`${apiUrl_discounts}/${encodeURIComponent(orderId)}`, { type, discount }, { headers: authHeaders() })
  );
  return res.data.data;
}

// [GET] 取消優惠券、點數折抵（後端編號 33 為 GET）
export async function cancel_discount(orderId) {
  const res = await tradeRequest(() =>
    axios.get(`${apiUrl_discounts}/${encodeURIComponent(orderId)}`, { headers: authHeaders() })
  );
  return res.data.data;
}

// [GET] 會員點數與優惠券
export async function get_points_coupons() {
  const res = await tradeRequest(() =>
    axios.get(`${apiUrl_userprofile}/pointslevel`, { headers: authHeaders() })
  );
  const row = res.data.data?.[0];
  if (!row) return { points: 0, coupons: [] };
  return {
    points: Number(row.travel_point) || 0,
    coupons: (row.coupon ?? []).filter((c) => c && c.coupon_id),
  };
}

// [POST] 建立付款：回傳要送往藍新的自動送出 HTML 字串
export async function post_payment(orderId) {
  const res = await tradeRequest(() =>
    axios.post(`${apiUrl_newebpay}/payment`, { order_id: orderId }, { headers: authHeaders(), responseType: 'text' })
  );
  return res.data;
}

// [POST] 編號 01 : 使用者註冊、個人偏好設定
export function post_user_SignUp(
  signUpName_txt,
  signUpEmail_txt,
  signUpPwd_txt,
  signUpPrefer_Array,
  onComplete
) {
  axios
    .post(`${apiUrl}/signup`, {
      name: signUpName_txt,
      email: signUpEmail_txt,
      password: signUpPwd_txt,
      preference: signUpPrefer_Array,
    })
    .then((res) => {
      Swal.fire({
        icon: 'success',
        title: res.data.status,
        text: res.data.message,
        scrollbarPadding: false,
        timer: 3000,
        timerProgressBar: true,
      }).then(() => router.push('/admin/login'));
    })
    .catch((error) => {
      Swal.fire({
        icon: 'error',
        title: error.response.data.status,
        text: error.response.data.message,
        scrollbarPadding: false,
      });
    })
    .finally(() => {
      if (typeof onComplete === 'function') {
        onComplete(); // ✅ 無論成功或失敗都清空
      }
    });
}

// [POST] 編號 02 : 使用者登入 - Email 登入
export function post_user_LoginEmail(signUpEmail_txt, signUpPwd_txt, onComplete) {
  axios
    .post(`${apiUrl}/login/email`, {
      email: signUpEmail_txt,
      password: signUpPwd_txt,
    })
    .then((res) => {
      localStorage.setItem('authToken', res.data.data.token);
      localStorage.setItem('userName', res.data.data.user.name);
      localStorage.setItem(
        'userPicture',
        res.data.data.user.avatar_url ||
          new URL('@/assets/img/default_people.png', import.meta.url).href
      );
      localStorage.setItem('levelName', res.data.data.level.name);

      userStore.login({
        token: res.data.data.token,
        name: res.data.data.user.name,
        avatar_url: res.data.data.user.avatar_url,
        level: res.data.data.level.name,
      });

      Swal.fire({
        icon: 'success',
        title: res.data.status,
        text: res.data.message,
        scrollbarPadding: false,
        timer: 3000,
        timerProgressBar: true,
      }).then(() => router.push('/admin/userprofile'));
    })
    .catch((error) => {
      console.log(error);
      Swal.fire({
        icon: 'error',
        title: error.response.data.status,
        text: error.response.data.message,
        scrollbarPadding: false,
      });
    })
    .finally(() => {
      if (typeof onComplete === 'function') {
        onComplete(); // ✅ 無論成功或失敗都清空
      }
    });
}

// [POST] 編號 03 : 使用者登入 - Google 登入
export function post_user_LoginGoogle(code) {
  axios
    .post(`${apiUrl}/login/google`, {
      code: code,
    })
    .then((res) => {
      localStorage.setItem('authToken', res.data.data.token);
      localStorage.setItem('userName', res.data.data.user.name);
      localStorage.setItem(
        'userPicture',
        res.data.data.user.avatar_url ? res.data.data.user.avatar_url : 'img/default_people.png'
      );
      localStorage.setItem('levelName', res.data.data.level.name);

      userStore.login({
        token: res.data.data.token,
        name: res.data.data.user.name,
        avatar_url: res.data.data.user.avatar_url,
        level: res.data.data.level.name,
      });

      //func.checkLoginStatus();
      Swal.fire({
        icon: 'success',
        title: res.data.status,
        text: res.data.message,
        scrollbarPadding: false,
        timer: 3000,
        timerProgressBar: true,
      }).then(() => router.push('/admin/userprofile'));
    })
    .catch((error) => {
      Swal.fire({
        icon: 'error',
        title: error,
        text: error,
        scrollbarPadding: false,
      });
    });
}

// [POST] 編號 05 : 使用者忘記密碼
export function post_user_forgetPW(signUpEmail_txt, onComplete) {
  axios
    .post(`${apiUrl}/forgetpw`, {
      email: signUpEmail_txt,
    })
    .then((res) => {
      Swal.fire({
        icon: 'success',
        title: res.data.status,
        text: res.data.message,
        scrollbarPadding: false,
      });
    })
    .catch((error) => {
      Swal.fire({
        icon: 'error',
        title: error.response.data.status,
        text: error.response.data.message,
        scrollbarPadding: false,
      });
    })
    .finally(() => {
      if (typeof onComplete === 'function') {
        onComplete(); // ✅ 無論成功或失敗都清空
      }
    });
}

// [PATCH] 編號 06 : 使用者密碼修改
export function post_user_resetPW(
  token,
  signUpNewPwd_txt,
  signUpNewaginPwd_txt,
  captchaInput_txt,
  onComplete
) {
  axios
    .patch(
      `${apiUrl}/resetpw`,
      {
        token: token,
        new_password: signUpNewPwd_txt,
        confirm_password: signUpNewaginPwd_txt,
        input: captchaInput_txt,
      },
      {
        withCredentials: true, // ← 這就是 credentials: 'include' 的對應
      }
    )
    .then((res) => {
      Swal.fire({
        icon: 'success',
        title: res.data.status,
        text: res.data.message,
        scrollbarPadding: false,
        timer: 3000,
        timerProgressBar: true,
      }).then(() => router.push('/admin/login'));
    })
    .catch((error) => {
      Swal.fire({
        icon: 'error',
        title: error.response.data.status,
        text: error.response.data.message,
        scrollbarPadding: false,
      });
    })
    .finally(() => {
      if (typeof onComplete === 'function') {
        onComplete(); // ✅ 無論成功或失敗都清空
      }
    });
}

// [GET] 編號 07 : 圖片、文字驗證碼判斷機器人
export function get_user_captcha() {
  axios
    .get(`${apiUrl}/captcha`, {
      withCredentials: true, // ← 這就是 credentials: 'include' 的對應
      responseType: 'text',
    })
    .then((res) => {
      document.getElementById('captcha').innerHTML = res.data;
    })
    .catch((error) => {
      Swal.fire({
        icon: 'error',
        title: error.response.data.status,
        text: error.response.data.message,
        scrollbarPadding: false,
      });
    });
}

// [GET] 編號 09 : 驗證使用者登入狀態
export async function get_user_status() {
  try {
    const res = await axios.get(`${apiUrl}/login/status`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    return {
      isLoggedIn: true,
      user: res.data.data.user,
    };
  } catch (err) {
    return {
      isLoggedIn: false,
      user: null,
      // 只有後端明確回 401 才代表 token 無效；網路錯誤等其他錯誤不應清掉登入資料
      unauthorized: err.response?.status === 401,
    };
  }
}

// [GET] 編號 10 : 使用者用戶資料呈現
export async function get_user_Profile() {
  try {
    const res = await axios.get(`${apiUrl_userprofile}/info`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
    });
    userStore.status(res.data);

    return res.data;
  } catch (err) {
    throw err; // ✅ 讓呼叫端也可以 catch 到錯誤
  }
}

// [PATCH] 編號 11 : 使用者用戶資料修改
export async function patch_user_Profile(payload) {
  try {
    const res = await axios.patch(`${apiUrl_userprofile}/info`, payload, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    Swal.fire({
      icon: 'success',
      title: res.data.status,
      text: res.data.message,
      scrollbarPadding: false,
    });
    userStore.status(res.data);
    return res.data;
  } catch (error) {
    if (error?.sessionExpired) {
      throw error; // 401 已由 interceptor 提示並導頁，不再跳自己的錯誤框
    }
    const data = error.response?.data;
    Swal.fire({
      icon: 'error',
      title: data?.status || '網路錯誤',
      text: data?.message || '無法連線到伺服器，請檢查網路後再試一次。',
      scrollbarPadding: false,
    });
    throw error; // ✅ 讓呼叫端也可以 catch 到錯誤
  }
}

// [PATCH] 編號 12 : 使用者照片個人上傳
export async function patch_user_Avatar(file) {
  const formData = new FormData();
  formData.append('image', file);
  try {
    const res = await axios.patch(`${apiUrl_userprofile}/avatar`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
    });
    const avatarUrl = res.data.data.avatar_url;
    localStorage.setItem('userPicture', avatarUrl);
    userStore.userPicture = avatarUrl;
    return res.data.data;
  } catch (error) {
    if (error?.sessionExpired) {
      throw error; // 401 已由 interceptor 提示並導頁，不再跳自己的錯誤框
    }
    const data = error.response?.data;
    Swal.fire({
      icon: 'error',
      title: data?.status || '網路錯誤',
      text: data?.message || '無法連線到伺服器，請檢查網路後再試一次。',
      scrollbarPadding: false,
    });
    throw error;
  }
}

//  [PATCH] 編號 06-2 : 使用者密碼修改 (會員中心)
export function post_user_resetProfilePW(Pwd_txt, NewPwd_txt, NewaginPwd_txt, onComplete) {
  axios
    .patch(
      `${apiUrl}/resetprofilepw`,
      {
        password: Pwd_txt,
        new_password: NewPwd_txt,
        confirm_password: NewaginPwd_txt,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      }
    )
    .then((res) => {
      Swal.fire({
        icon: 'success',
        title: res.data.status,
        text: res.data.message,
        scrollbarPadding: false,
        timer: 1500,
        showConfirmButton: false,
      });
      // 改密碼後舊 token 已失效：清登入資料並導回登入頁
      userStore.logout();
      router.push('/admin/login');
    })
    .catch((error) => {
      if (error?.sessionExpired) {
        return; // 401 已由 interceptor 提示並導頁
      }
      Swal.fire({
        icon: 'error',
        title: error.response.data.status,
        text: error.response.data.message,
        scrollbarPadding: false,
      });
    })
    .finally(() => {
      if (typeof onComplete === 'function') {
        onComplete(); // ✅ 無論成功或失敗都清空
      }
    });
}
