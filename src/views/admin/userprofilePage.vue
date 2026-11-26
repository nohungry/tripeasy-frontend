<template>
  <div class="wrap">
    <!-- Header -->
    <HeaderComponent />

    <!-- Content -->
    <div class="content">
      <div class="container">
        <div class="row">
          <!-- 側邊欄 -->
          <div class="sidebar col-md-3 col-lg-2">
            <div class="sidebar-content">
              <img
                class="headimg"
                :src="userStore.userPicture"
                alt="頭像"
                title="點擊更換頭像"
                @click="$refs.avatarInput.click()"
              />
              <input
                ref="avatarInput"
                type="file"
                accept="image/*"
                aria-label="上傳頭像"
                class="d-none"
                @change="uploadAvatar"
              />
              <div class="name">{{ user.name }}</div>
              <div
                class="sidebaritem"
                :class="{ active: currentTab === tab }"
                v-for="tab in tabs"
                :key="tab"
                @click="selectTab(tab)"
              >
                <i :class="icons[tab] + ' me-2'"></i>{{ tab }}
              </div>
            </div>
          </div>

          <!-- 主要內容 -->
          <div class="col-md-9 col-lg-10">
            <div class="title"><i class="bi bi-person-circle me-2"></i>會員中心</div>

            <!-- 尚未開放的分頁 -->
            <div v-if="currentTab === '個人偏好設定'" class="coming-soon">即將開放</div>

            <!-- 會員等級 -->
            <section v-if="currentTab === '會員等級'" class="level-panel">
              <template v-if="levelLoaded">
                <div class="level-card">
                  <img
                    v-if="level.badge_url"
                    :src="level.badge_url"
                    alt="等級徽章"
                    class="level-badge"
                  />
                  <div>
                    <div class="level-name">目前等級 {{ level.level_name }}</div>
                    <div>購物回饋比例 {{ REWARD_RATE_TEXT }}</div>
                    <div>點數餘額 {{ level.travel_point }} 點</div>
                    <div class="level-note">升級規則尚未開放</div>
                  </div>
                </div>

                <div class="level-subtitle">優惠券</div>
                <div v-if="level.coupons.length === 0" class="orders-empty">
                  目前沒有可用的優惠券
                </div>
                <ul v-else class="coupon-list">
                  <li v-for="coupon in level.coupons" :key="coupon.coupon_id">
                    <span class="coupon-code">{{ coupon.code }}</span>
                    <span>{{ coupon.description }}</span>
                    <span class="order-time"
                      >期限 {{ formatTime(coupon.expire_date) }}</span
                    >
                  </li>
                </ul>
              </template>

              <div class="level-subtitle">點數紀錄</div>
              <div class="level-note">
                點數紀錄為明細，加總不一定等於目前餘額（初始點數沒有對應紀錄）
              </div>
              <div
                v-if="pointsLoaded && pointRecords.length === 0"
                class="orders-empty"
              >
                目前沒有點數紀錄
              </div>
              <div
                v-for="(record, index) in pointRecords"
                :key="index"
                class="point-row"
                data-testid="point-record"
              >
                <span class="order-time">{{ formatTime(record.created_at) }}</span>
                <span>{{ record.reason }}</span>
                <span class="point-amount">{{ formatSigned(record.point) }}</span>
                <span class="order-no">{{
                  record.order_id ? record.order_id.slice(0, 8) : ''
                }}</span>
              </div>
              <div v-if="pointsTotalPages > 1" class="orders-pager">
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  :disabled="pointsPage <= 1"
                  @click="fetchPointRecords(pointsPage - 1)"
                >
                  上一頁
                </button>
                <span>{{ pointsPage }} / {{ pointsTotalPages }}</span>
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  :disabled="pointsPage >= pointsTotalPages"
                  @click="fetchPointRecords(pointsPage + 1)"
                >
                  下一頁
                </button>
              </div>
            </section>

            <!-- 個人訂單查看 -->
            <section v-if="currentTab === '個人訂單查看'" class="orders-panel">
              <div v-if="ordersLoaded && orders.length === 0" class="orders-empty">目前沒有訂單</div>
              <div v-for="order in orders" :key="order.order_id" class="order-row" data-testid="order-row">
                <div class="order-summary">
                  <div class="order-main">
                    <span class="order-no">{{ order.order_id.slice(0, 8) }}</span>
                    <span class="order-time">{{ formatTime(order.created_at) }}</span>
                  </div>
                  <div class="order-title">
                    {{ order.first_item ? order.first_item.title : '（行程已移除）' }}
                    <span class="order-count">{{ order.item_count }} 項</span>
                  </div>
                  <div class="order-side">
                    <span class="order-status">{{ orderStatusText(order) }}</span>
                    <span class="order-payable">NT${{ formatMoney(order.payable) }}</span>
                  </div>
                </div>
                <div v-if="order.deadline && (order.can_continue_payment || order.is_overdue)" class="order-deadline">
                  付款期限 {{ formatTime(order.deadline) }}
                </div>
                <div class="order-actions">
                  <button type="button" class="btn btn-outline-secondary btn-sm" @click="toggleDetail(order)">
                    明細
                  </button>
                  <button
                    v-if="order.can_continue_payment"
                    type="button"
                    class="btn btn-primary btn-sm"
                    @click="continuePayment(order)"
                  >
                    繼續付款
                  </button>
                </div>
                <div v-if="openDetailId === order.order_id" class="order-detail" data-testid="order-detail">
                  <template v-if="detail">
                    <div class="detail-title">品項</div>
                    <ul>
                      <li v-for="item in detail.items" :key="item.order_item_id">
                        {{ item.title }} × {{ item.quantity }}　NT${{ formatMoney(item.total_price) }}
                      </li>
                    </ul>
                    <div class="detail-title">收件資料</div>
                    <div>地址：{{ detail.shipping.address || '—' }}</div>
                    <div>電話：{{ detail.shipping.phone || '—' }}</div>
                    <div class="detail-title">折扣</div>
                    <div v-if="detail.money.discount_type !== 'none'">
                      {{ DISCOUNT_LABELS[detail.money.discount_type] ?? detail.money.discount_type }}　-NT${{ formatMoney(detail.money.discount_amount) }}
                    </div>
                    <div v-else>無</div>
                    <div class="detail-title">付款紀錄</div>
                    <div v-if="detail.payments.length === 0">尚無付款紀錄</div>
                    <ul v-else>
                      <li v-for="(p, idx) in detail.payments" :key="idx">
                        {{ formatTime(p.created_at) }}　{{ p.result }}
                      </li>
                    </ul>
                  </template>
                  <div v-else>載入中…</div>
                </div>
              </div>
              <div v-if="ordersTotalPages > 1" class="orders-pager">
                <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="ordersPage <= 1" @click="changeOrdersPage(ordersPage - 1)">
                  上一頁
                </button>
                <span>{{ ordersPage }} / {{ ordersTotalPages }}</span>
                <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="ordersPage >= ordersTotalPages" @click="changeOrdersPage(ordersPage + 1)">
                  下一頁
                </button>
              </div>
            </section>

            <!-- 會員資訊表單 -->
            <form v-if="currentTab === '會員資訊'" id="userinfo" @submit.prevent>
              <div class="form-title"><i class="bi bi-person-vcard me-2"></i>會員資訊</div>
              <div class="form-group">
                <label for="name" class="form-label">姓名</label>
                <input
                  type="text"
                  class="form-control"
                  id="name"
                  v-model="user.name"
                  :disabled="!isEditable.name"
                />
                <span class="edit-icon" @click="toggleEdit('name')"
                  ><i class="bi bi-pencil-square"></i
                ></span>
              </div>
              <div class="form-group">
                <label for="email" class="form-label">信箱</label>
                <input
                  type="email"
                  class="form-control"
                  id="email"
                  v-model="user.email"
                  disabled="false"
                />
              </div>
              <div class="form-group" v-for="(pref, idx) in preferences" :key="idx">
                <label :for="'preference' + (idx + 1)" class="form-label">{{ pref.label }}</label>
                <select
                  class="form-select"
                  :id="'preference' + (idx + 1)"
                  v-model="user[pref.model]"
                >
                  <option
                    v-for="opt in options"
                    :key="opt"
                    :value="opt"
                    :disabled="isOptionDisabled(opt, pref.model)"
                  >
                    {{ opt }}
                  </option>
                </select>
              </div>
              <div class="btn_saveBtn">
                <button type="button" class="btn btn-primary save-button" @click="updateUserInfo">
                  <i class="bi bi-check-circle me-2"></i>儲存設定
                </button>
              </div>
            </form>

            <!-- 修改密碼表單 -->
            <form v-if="currentTab === '會員資訊'" id="password">
              <div class="form-title"><i class="bi bi-shield-lock me-2"></i>密碼管理</div>
              <div class="password-container">
                <div class="password-inputs">
                  <div class="form-group">
                    <input
                      type="password"
                      v-model="password.current"
                      class="form-control password-input"
                      id="currentPassword"
                      placeholder="請輸入舊密碼"
                    />
                  </div>
                  <div class="form-group">
                    <div class="password-input-group">
                      <input
                        :type="passwordVisible.new ? 'text' : 'password'"
                        :disabled="!isEditable.new"
                        v-model="password.new.value"
                        class="form-control password-input"
                        id="newPassword"
                        placeholder="請輸入新密碼"
                      />
                      <span class="password-toggle" @click="togglePassword('new')">
                        <i :class="passwordVisible.new ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                      </span>
                      <span class="edit-icon pw-edit-icon" @click="toggleEdit('new')"
                        ><i class="bi bi-pencil-square"></i
                      ></span>
                    </div>
                  </div>
                  <div class="form-group">
                    <div class="password-input-group">
                      <input
                        :type="passwordVisible.confirm ? 'text' : 'password'"
                        :disabled="!isEditable.confirm"
                        v-model="password.new.confirm"
                        class="form-control password-input"
                        id="confirmNewPassword"
                        placeholder="再次輸入新密碼"
                      />
                      <span class="password-toggle" @click="togglePassword('confirm')">
                        <i :class="passwordVisible.confirm ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                      </span>
                      <span class="edit-icon pw-edit-icon" @click="toggleEdit('confirm')"
                        ><i class="bi bi-pencil-square"></i
                      ></span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="btn_saveBtn">
                <button
                  type="button"
                  class="btn btn-primary save-button"
                  @click="updateUserPassword"
                >
                  <i class="bi bi-check-circle me-2"></i>更新密碼
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    <!-- Footer -->
    <FooterComponent />
  </div>
</template>

<script setup>
import { userStore } from '@/stores/userStore.js';
</script>

<script>
import HeaderComponent from '@/components/HeaderComponent.vue';
import FooterComponent from '@/components/FooterComponent.vue';
import * as func from '@/utils/function.js';
import * as api from '@/utils/api.js';
import Swal from 'sweetalert2';

// ?tab= 對應的分頁；未知或缺少 → info
const TAB_KEYS = { info: '會員資訊', level: '會員等級', preference: '個人偏好設定', orders: '個人訂單查看' };
// Object.hasOwn：避免 ?tab=constructor、toString、__proto__ 取到原型上的成員
function tabLabel(tab) {
  return typeof tab === 'string' && Object.hasOwn(TAB_KEYS, tab) ? TAB_KEYS[tab] : TAB_KEYS.info;
}
const DISCOUNT_LABELS = { coupon: '優惠券', point: '點數折抵' };
const ORDERS_PER_PAGE = 10;
const POINTS_PER_PAGE = 10;
// 回饋比例 API 沒有輸出（F10）；與後端 settlePaidOrder 的 floor(payable × 0.1) 一致
const REWARD_RATE_TEXT = '10%';

export default {
  name: 'userprofilePage',
  components: { HeaderComponent, FooterComponent },
  data() {
    return {
      isEditable: {
        name: false,
        new: false,
        confirm: false,
      },
      TAB_KEYS,
      DISCOUNT_LABELS,
      REWARD_RATE_TEXT,
      tabs: Object.values(TAB_KEYS),
      orders: [],
      ordersTotal: 0,
      ordersPage: 1,
      ordersLoaded: false,
      level: { level_name: '', badge_url: '', travel_point: 0, coupons: [] },
      levelLoaded: false,
      pointRecords: [],
      pointsTotal: 0,
      pointsPage: 1,
      pointsLoaded: false,
      openDetailId: null,
      detail: null,
      icons: {
        會員資訊: 'bi bi-person-vcard',
        會員等級: 'bi bi-trophy',
        個人偏好設定: 'bi bi-gear',
        個人訂單查看: 'bi bi-cart-check',
        密碼管理: 'bi bi-shield-lock',
      },
      user: {
        name: '',
        email: '',
        preference1: '',
        preference2: '',
        preference3: '',
      },
      preferences: [
        { label: '個人偏好', model: 'preference1' },
        { label: '次要偏好', model: 'preference2' },
        { label: '第三偏好', model: 'preference3' },
      ],
      options: [
        '探索冒險',
        '放鬆療癒',
        '文化體驗',
        '美食探索',
        '都市感官',
        '自然療癒',
        '親子家庭',
        '拍照打卡',
        '懶人輕鬆',
        '特殊主題',
      ],
      password: {
        current: '',
        new: {
          value: '',
          confirm: '',
        },
      },
      passwordVisible: {
        new: false,
        confirm: false,
      },
    };
  },
  computed: {
    currentTab() {
      return tabLabel(this.$route.query.tab);
    },
    pointsTotalPages() {
      return Math.max(1, Math.ceil(this.pointsTotal / POINTS_PER_PAGE));
    },
    ordersTotalPages() {
      return Math.max(1, Math.ceil(this.ordersTotal / ORDERS_PER_PAGE));
    },
  },
  watch: {
    currentTab(tab) {
      if (tab === TAB_KEYS.orders) this.fetchOrders(1);
      if (tab === TAB_KEYS.level) this.fetchLevel();
    },
  },
  mounted() {
    this.fetchUserInfo();
    if (this.currentTab === TAB_KEYS.orders) this.fetchOrders(1);
    if (this.currentTab === TAB_KEYS.level) this.fetchLevel();
  },
  methods: {
    selectTab(label) {
      const tab = Object.keys(TAB_KEYS).find((key) => TAB_KEYS[key] === label);
      if (tab && tabLabel(this.$route.query.tab) !== label) {
        this.$router.replace({ query: { tab } });
      }
    },
    fetchLevel() {
      this.fetchMemberLevel();
      this.fetchPointRecords(1);
    },
    async fetchMemberLevel() {
      const seq = (this.levelSeq = (this.levelSeq || 0) + 1);
      try {
        const level = await api.get_member_level();
        if (seq !== this.levelSeq) return;
        this.level = level;
        this.levelLoaded = true;
      } catch (error) {
        // 錯誤提示已在 api 內顯示
      }
    },
    async fetchPointRecords(page) {
      const seq = (this.pointsSeq = (this.pointsSeq || 0) + 1);
      try {
        const res = await api.get_point_records({ page, limit: POINTS_PER_PAGE });
        if (seq !== this.pointsSeq) return;
        this.pointRecords = res.data;
        this.pointsTotal = res.total;
        this.pointsPage = page;
        this.pointsLoaded = true;
      } catch (error) {
        // 錯誤提示已在 api 內顯示
      }
    },
    formatSigned(value) {
      const n = Number(value);
      return n > 0 ? `+${n}` : String(n);
    },
    async fetchOrders(page) {
      const seq = (this.ordersSeq = (this.ordersSeq || 0) + 1);
      this.openDetailId = null;
      this.detail = null;
      try {
        const res = await api.get_orders({ page, limit: ORDERS_PER_PAGE });
        if (seq !== this.ordersSeq) return;
        this.orders = res.data;
        this.ordersTotal = res.total;
        this.ordersPage = page;
        this.ordersLoaded = true;
      } catch (error) {
        // 錯誤提示已在 api 內顯示
      }
    },
    changeOrdersPage(page) {
      this.fetchOrders(page);
    },
    async toggleDetail(order) {
      if (this.openDetailId === order.order_id) {
        this.openDetailId = null;
        this.detail = null;
        return;
      }
      this.openDetailId = order.order_id;
      this.detail = null;
      try {
        const detail = await api.get_order(order.order_id);
        if (this.openDetailId === order.order_id) this.detail = detail;
      } catch (error) {
        // 錯誤提示已在 api 內顯示；還原展開狀態，避免卡在「載入中…」
        if (this.openDetailId === order.order_id) this.openDetailId = null;
      }
    },
    continuePayment(order) {
      this.$router.push({ name: 'pay', query: { order: order.order_id } });
    },
    // 前端不比對時間（F1）：只讀後端的 is_overdue
    orderStatusText(order) {
      return order.is_overdue ? '已逾時' : order.status_label;
    },
    formatTime(value) {
      return value ? new Date(value).toLocaleString('zh-TW', { hour12: false }) : '';
    },
    formatMoney(value) {
      return Number(value).toLocaleString('en-US');
    },
    togglePassword(key) {
      this.passwordVisible[key] = !this.passwordVisible[key];
    },

    toggleEdit(key) {
      this.isEditable[key] = !this.isEditable[key];
    },

    isOptionDisabled(option, currentModel) {
      const selected = [
        { key: 'preference1', val: this.user.preference1 },
        { key: 'preference2', val: this.user.preference2 },
        { key: 'preference3', val: this.user.preference3 },
      ];
      return selected.some((sel) => sel.key !== currentModel && sel.val === option);
    },

    async fetchUserInfo() {
      const data = await api.get_user_Profile();

      this.user = {
        name: data.data.user.name,
        email: data.data.user.email,
        preference1: data.data.user.preferences[0],
        preference2: data.data.user.preferences[1],
        preference3: data.data.user.preferences[2],
      };
    },

    async uploadAvatar(event) {
      const file = event.target.files[0];
      if (!file) return;
      try {
        await api.patch_user_Avatar(file);
      } catch (error) {
        // 錯誤提示已在 api 內顯示
      } finally {
        event.target.value = ''; // 允許重選同一張
      }
    },

    async updateUserInfo() {
      const nameMessage = func.nameError(this.user.name);
      if (nameMessage) {
        Swal.fire({ icon: 'error', text: nameMessage, scrollbarPadding: false });
        return;
      }
      const payload = {
        name: this.user.name,
        preference: [this.user.preference1, this.user.preference2, this.user.preference3],
      };
      await api.patch_user_Profile(payload);
      this.isEditable.name = false;
    },

    async updateUserPassword() {

      await api.post_user_resetProfilePW(
        this.password.current,
        this.password.new.value,
        this.password.new.confirm,
        () => {
          this.password.current = '';
          this.password.new.value = '';
          this.password.new.confirm = '';
          this.isEditable.password = false;
        }
      );

      this.isEditable.new = false;
      this.isEditable.confirm = false;
    },
  },
};
</script>

<style scoped>
@import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css');
@import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');

@import '@/assets/css/common.css';
@import '/src/assets/css/common.css';

/* 全局樣式 */
:root {
  --primary-color: #c1e9dc;
  --secondary-color: #1cc88a;
  --background-color: #f8f9fc;
  --sidebar-bg: #c1e9dc;
  --sidebar-text: #fff;
  --form-bg: #fff;
  --border-radius: 0.5rem;
  --box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
}

body {
  font-family: 'Noto Sans TC', sans-serif;
  background-color: var(--background-color);
  color: #333;
  padding-top: 20px;
}

.container {
  padding: 2rem 0;
}

/* 側邊欄樣式 */
/*
.sidebar {
  background-color: #9dbeb3;
  color: #fff;
  border-radius: 0.5rem;
  padding: 1.5rem 1rem;
  min-height: 100vh;
  box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
  position: relative;
  transition: all 0.3s;
}
  */

.sidebar-content {
  background-color: #ffffff;
  color: #5B5B5B;
  border-radius: 0.5rem;
  padding: 1rem 0.5rem 32px 0.5rem;

  box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
  transition: all 0.3s;
}

.headimg {
  width: 100px;
  height: 100px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 3px solid rgba(255, 255, 255, 0.5);
}

.name {
  text-align: center;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.sidebaritem {
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 0.3rem;
  cursor: pointer;
  transition: all 0.2s;
}

.sidebaritem:hover {
  background-color: #5B5B5B;
  color: #fff;
  transform: translateX(5px);
}

.sidebaritem.active {
  background-color: #ffffff;
  color: #5B5B5B;
  font-weight: 600;
}

/* 主要內容區域 */
.content {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 1.5rem 2rem;
  padding-top: 100px;
}

.title {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: #333;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #9dbeb3;
}

/* 表單樣式 */
#userinfo,
#password {
  background-color: #fff;
  border-radius: 0.5rem;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
}

.form-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #9dbeb3;
}

.form-group {
  margin-bottom: 1.5rem;
  position: relative;
}

.form-label {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-control,
.form-select {
  border-radius: 0.3rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d3e2;
  transition: all 0.2s;
}

.form-control:focus,
.form-select:focus {
  border-color: #9dbeb3;
  box-shadow: 0 0 0 0.25rem rgba(78, 115, 223, 0.25);
}

select option:disabled {
  color: #d4d4d4 !important;
  background-color: #f8f9fa !important;
}

.coming-soon {
  background-color: #fff;
  border-radius: 0.5rem;
  padding: 3rem 2rem;
  margin-bottom: 2rem;
  text-align: center;
  color: #6c757d;
  box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
}

/* 訂單分頁 */
.orders-empty {
  padding: 40px 0;
  text-align: center;
  color: #888;
}
.order-row {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.order-summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.order-no {
  font-weight: bold;
  margin-right: 8px;
}
.order-time,
.order-count,
.order-deadline {
  color: #888;
  font-size: 0.9em;
}
.order-count {
  margin-left: 8px;
}
.order-side {
  display: flex;
  gap: 12px;
}
.order-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
.order-detail {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}
.detail-title {
  font-weight: bold;
  margin-top: 8px;
}
.level-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.level-badge {
  width: 64px;
  height: 64px;
  object-fit: contain;
}
.level-name {
  font-weight: 600;
}
.level-subtitle {
  font-weight: 600;
  margin: 16px 0 8px;
}
.level-note {
  color: #888;
  font-size: 0.9rem;
}
.coupon-list {
  list-style: none;
  padding: 0;
}
.coupon-list li,
.point-row {
  display: flex;
  gap: 16px;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  padding: 10px 16px;
  margin-bottom: 8px;
}
.coupon-code,
.point-amount {
  font-weight: 600;
}
.orders-pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}
/* 編輯圖標 */
.edit-icon {
  position: absolute;
  right: 10px;
  top: calc(50% + 4px);
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-icon:hover {
  color: #9dbeb3;
}

.pw-edit-icon {
  top: 8px;
}

/* 密碼區塊 */
.password-container {
  display: flex;
  margin-bottom: 1.5rem;
}

.password-label {
  font-weight: 500;
  width: 20%;
  padding-top: 0.5rem;
}

.password-inputs {
  width: 100%;
}

.password-input-group {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
  cursor: pointer;
}

.password-toggle:hover {
  color: #9dbeb3;
}

/* 按鈕樣式 */
.btn_saveBtn {
  display: flex;
  justify-content: end;
}

.save-button {
  background-color: #9dbeb3;
  border: none;
  padding: 0.5rem 2rem;
  border-radius: 0.3rem;
  font-weight: 500;
  transition: all 0.3s;
}

.save-button:hover {
  background-color: #b1d6ca;
  transform: translateY(-2px);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

/* 響應式設計 */
@media (max-width: 992px) {
  .sidebar {
    min-height: auto;
    margin-bottom: 1.5rem;
  }

  .password-container {
    flex-direction: column;
  }

  .password-label,
  .password-inputs {
    width: 100%;
  }

  .password-label {
    margin-bottom: 1rem;
  }
}

@media (max-width: 768px) {
  .content {
    padding: 1rem;
  }

  #userinfo,
  #password {
    padding: 1.5rem;
  }
}
</style>
