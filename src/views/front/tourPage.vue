<template>
  <div class="wrap">
    <div v-if="error" class="container my-5 text-center">
      <h2 class="fw-bold">載入失敗，請稍後再試</h2>
    </div>

    <div v-else-if="loaded && !tour" class="container my-5 text-center">
      <h2 class="fw-bold">查無此行程</h2>
      <router-link to="/search" class="btn btn-outline-primary mt-3">回搜尋頁</router-link>
    </div>

    <div v-else-if="tour" class="container my-4">
      <div v-if="tour.emergency_notice" class="alert alert-warning" role="alert">
        {{ tour.emergency_notice }}
      </div>

      <div class="mb-4">
        <h2 class="fw-bold">{{ tour.title }}</h2>
        <h4 v-if="tour.title_slogan" class="text-muted">{{ tour.title_slogan }}</h4>
      </div>

      <div class="row mb-4">
        <div class="col-md-6 mb-3">
          <img v-if="tour.image_url" :src="tour.image_url" :alt="tour.title" class="img-fluid rounded w-100" />
        </div>
        <div class="col-md-6">
          <p class="price mb-2">
            <template v-if="tour.promotion && tour.promotion.is_promoted">
              <span class="promo-price fs-3 fw-bold text-danger">{{ formatPrice(tour.promotion.promo_price) }}</span>
              <del class="ms-2 text-muted">{{ formatPrice(tour.price) }}</del>
            </template>
            <span v-else class="fs-3 fw-bold">{{ formatPrice(tour.price) }}</span>
          </p>
          <p class="mb-2">
            出發日期：{{ dateText(tour.date_start) }}
            <template v-if="tour.date_end">～{{ dateText(tour.date_end) }}</template>
          </p>
          <p v-if="tour.tags && tour.tags.length" class="mb-2">
            <span v-for="tag in tour.tags" :key="tag" class="badge bg-secondary me-1">{{ tag }}</span>
          </p>
          <p class="illustrate">{{ tour.description }}</p>
          <p v-if="tour.location" class="mb-2">
            {{ [tour.location.country, tour.location.region, tour.location.address].filter(Boolean).join(' ') }}
            <a
              v-if="safeUrl(tour.location.google_map)"
              :href="safeUrl(tour.location.google_map)"
              target="_blank"
              rel="noopener noreferrer"
              class="ms-2"
              >Google Map</a
            >
          </p>
          <form class="order-box mt-3" data-testid="order-form" @submit.prevent="addToCart">
            <div class="mb-2">
              <label for="order-people" class="form-label">人數</label>
              <input id="order-people" v-model.number="orderForm.people" type="number" min="1" step="1" class="form-control" />
            </div>
            <template v-if="tour.item === 'food'">
              <div class="mb-2">
                <label for="order-start" class="form-label">預約時間</label>
                <input id="order-start" v-model="orderForm.startDateTime" type="datetime-local" :min="todayText + 'T00:00'" class="form-control" />
              </div>
            </template>
            <template v-else>
              <div class="mb-2">
                <label for="order-start" class="form-label">出發日期</label>
                <input id="order-start" v-model="orderForm.startDate" type="date" :min="todayText" class="form-control" />
              </div>
              <div class="mb-2">
                <label for="order-end" class="form-label">結束日期</label>
                <input id="order-end" v-model="orderForm.endDate" type="date" :min="orderForm.startDate || todayText" class="form-control" />
              </div>
            </template>
            <div v-if="tour.item === 'hotel'" class="mb-2">
              <label for="order-room" class="form-label">房型</label>
              <select id="order-room" v-model="orderForm.roomType" class="form-select" :disabled="!roomNames.length">
                <option v-for="name in roomNames" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>
            <p v-if="hotelWithoutRooms" class="text-muted">此行程暫不開放線上訂購</p>
            <button type="submit" class="btn btn-primary" :disabled="hotelWithoutRooms || adding">加入購物車</button>
          </form>
        </div>
      </div>

      <div v-if="spots.length" class="row g-3 mb-5">
        <div v-for="(s, i) in spots" :key="i" class="col-6 col-md-4">
          <img :src="s.image_url" :alt="s.description || '環境照'" class="img-fluid rounded w-100" />
          <p v-if="s.description" class="small text-muted mt-1">{{ s.description }}</p>
        </div>
      </div>

      <!-- travel / spot -->
      <template v-if="tour.item === 'travel' || tour.item === 'spot'">
        <section class="mb-5">
          <h3 class="c-title">行程特色</h3>
          <div v-for="(f, i) in features" :key="i" class="mb-3 row">
            <div class="col-md-6"><p class="illustrate">{{ f.description }}</p></div>
            <div class="col-md-6">
              <img v-if="f.image_url" :src="f.image_url" :alt="f.description || ''" class="img-fluid rounded" />
            </div>
          </div>
        </section>
        <section class="mb-5">
          <h3 class="c-title">行程規劃</h3>
          <p class="illustrate itinerary">{{ tour.itinerary }}</p>
        </section>
      </template>

      <!-- hotel -->
      <template v-else-if="tour.item === 'hotel'">
        <section class="mb-5">
          <h3 class="c-title">房型介紹</h3>
          <div v-for="(r, i) in rooms" :key="i" class="mb-4 row">
            <div class="col-md-6">
              <h5>{{ r.name }}</h5>
              <p class="illustrate">{{ r.description }}</p>
              <p v-if="r.capacity" class="small text-muted">可住 {{ r.capacity }} 人</p>
            </div>
            <div class="col-md-6">
              <img v-if="r.image_url" :src="r.image_url" :alt="r.name || ''" class="img-fluid rounded" />
            </div>
          </div>
        </section>
        <section class="mb-5">
          <h3 class="c-title">客房服務</h3>
          <div class="row row-cols-1 row-cols-md-3 g-4">
            <div v-for="(s, i) in services" :key="i" class="col">
              <h6 class="fw-bold">{{ s.name }}</h6>
              <p>{{ s.item }}</p>
            </div>
          </div>
        </section>
      </template>

      <!-- food -->
      <template v-else-if="tour.item === 'food'">
        <section class="mb-5">
          <h3 class="c-title">餐廳介紹</h3>
          <p v-if="about.people">用餐人數限制：{{ about.people }}</p>
          <p class="illustrate">{{ about.description }}</p>
          <a
            v-if="safeUrl(about.web_url)"
            :href="safeUrl(about.web_url)"
            target="_blank"
            rel="noopener noreferrer"
            >官方網站</a
          >
        </section>
        <section class="mb-5">
          <h3 class="c-title">菜單</h3>
          <ul class="list-unstyled">
            <li v-for="(m, i) in menu" :key="i" class="mb-2">
              <strong>{{ m.name }}</strong>
              <span v-if="m.price !== null && m.price !== undefined" class="ms-2">{{ formatPrice(m.price) }}</span>
              <div class="illustrate">{{ m.description }}</div>
            </li>
          </ul>
        </section>
        <section class="mb-5">
          <h3 class="c-title">營業時間</h3>
          <ul class="list-unstyled">
            <li v-for="(o, i) in opening" :key="i">{{ o.week }}　{{ o.time }}</li>
          </ul>
        </section>
      </template>

      <section class="mb-5" data-testid="review-section">
        <h3 class="c-title">旅客評論</h3>
        <p v-if="reviews.length" class="fw-bold">平均 {{ averageRating.toFixed(1) }} 分</p>
        <p v-else class="text-muted">目前還沒有評論</p>
        <ul class="list-unstyled">
          <li v-for="r in reviews" :key="r.review_id" class="mb-3 border-bottom pb-2" data-testid="review-item">
            <div>
              <strong>{{ r.name }}</strong>
              <span v-if="r.level && r.level.name" class="badge bg-info ms-2">{{ r.level.name }}</span>
              <span class="ms-2">{{ r.rating }} 分</span>
              <small class="text-muted ms-2">{{ createdText(r.create_date) }}</small>
            </div>
            <div class="illustrate">{{ r.content }}</div>
          </li>
        </ul>
        <button v-if="hasMoreReviews" type="button" class="btn btn-outline-primary mb-3" :disabled="loadingMoreReviews" @click="loadMoreReviews">
          載入更多評論
        </button>

        <p v-if="!isLoggedIn" class="text-muted">
          <span>登入後，購買過此行程的會員可以評論與分享隱藏玩法</span>
          <router-link to="/admin/login" class="ms-2">登入</router-link>
        </p>
        <p v-else-if="!eligibilityLoaded" class="text-muted"></p>
        <p v-else-if="!eligibility.can_write" class="text-muted">購買過此行程的會員才能評論與分享隱藏玩法</p>
        <p v-else-if="eligibility.has_reviewed" class="text-success">你已評論過此行程</p>
        <form v-else data-testid="review-form" @submit.prevent="submitReview">
          <div class="mb-2">
            <label for="review-rating" class="form-label">評分</label>
            <select id="review-rating" v-model.number="reviewForm.rating" class="form-select">
              <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <div class="mb-2">
            <label for="review-content" class="form-label">評論內容</label>
            <textarea
              id="review-content"
              v-model="reviewForm.content"
              class="form-control"
              maxlength="500"
              rows="3"
            ></textarea>
            <small class="text-muted">{{ reviewForm.content.length }}/500</small>
          </div>
          <button type="submit" class="btn btn-primary" :disabled="submitting">送出評論</button>
        </form>
      </section>

      <section class="mb-5" data-testid="share-section">
        <h3 class="c-title">隱藏玩法</h3>
        <p v-if="!shares.length" class="text-muted">目前還沒有隱藏玩法</p>
        <ul class="list-unstyled">
          <li v-for="s in shares" :key="s.shares_id" class="mb-3 border-bottom pb-2" data-testid="share-item">
            <h5>{{ s.title }}</h5>
            <div class="illustrate">{{ s.content }}</div>
            <small class="text-muted">{{ s.name }}　{{ createdText(s.create_date) }}</small>
            <div v-if="safeUrl(s.url)">
              <a :href="safeUrl(s.url)" target="_blank" rel="noopener noreferrer">查看分享連結</a>
            </div>
          </li>
        </ul>
        <button v-if="hasMoreShares" type="button" class="btn btn-outline-primary mb-3" :disabled="loadingMoreShares" @click="loadMoreShares">
          載入更多玩法
        </button>

        <p v-if="!isLoggedIn" class="text-muted">
          <span>登入後，購買過此行程的會員可以評論與分享隱藏玩法</span>
          <router-link to="/admin/login" class="ms-2">登入</router-link>
        </p>
        <p v-else-if="!eligibilityLoaded" class="text-muted"></p>
        <p v-else-if="!eligibility.can_write" class="text-muted">購買過此行程的會員才能評論與分享隱藏玩法</p>
        <form v-else data-testid="share-form" @submit.prevent="submitShare">
          <div class="mb-2">
            <label for="share-title" class="form-label">標題</label>
            <input id="share-title" v-model="shareForm.title" type="text" class="form-control" maxlength="50" />
          </div>
          <div class="mb-2">
            <label for="share-content" class="form-label">內容</label>
            <textarea
              id="share-content"
              v-model="shareForm.content"
              class="form-control"
              maxlength="1000"
              rows="3"
            ></textarea>
          </div>
          <div class="mb-2">
            <label for="share-url" class="form-label">分享連結（選填）</label>
            <input id="share-url" v-model="shareForm.url" type="text" class="form-control" autocapitalize="off" autocorrect="off" spellcheck="false" />
          </div>
          <button type="submit" class="btn btn-primary" :disabled="submitting">分享玩法</button>
        </form>
      </section>
    </div>
  </div>
</template>

<script>
import Swal from 'sweetalert2';
import { userStore } from '@/stores/userStore.js';
import {
  get_tour_detail,
  get_tour_reviews,
  get_tour_hidden_shares,
  get_tour_eligibility,
  post_tour_review,
  post_tour_hidden_share,
  post_cart_item,
} from '@/utils/api.js';

const PAGE_SIZE = 5;

export default {
  name: 'tourPage',
  data() {
    return {
      tour: null,
      loaded: false,
      error: false,
      averageRating: 0,
      reviews: [],
      reviewPage: 1,
      hasMoreReviews: false,
      shares: [],
      sharePage: 1,
      hasMoreShares: false,
      eligibility: { can_write: false, has_reviewed: false },
      eligibilityLoaded: false,
      loadingMoreReviews: false,
      loadingMoreShares: false,
      reviewForm: { rating: 5, content: '' },
      shareForm: { title: '', content: '', url: '' },
      submitting: false,
      adding: false,
      orderForm: { people: 1, startDate: '', endDate: '', startDateTime: '', roomType: '' },
    };
  },
  computed: {
    isLoggedIn() {
      return userStore.isLoggedIn;
    },
    spots() {
      return (this.tour?.image_spot || []).filter((s) => s && s.image_url);
    },
    features() {
      const f = this.tour?.feature;
      return Array.isArray(f) ? f.filter((x) => x && (x.description || x.image_url)) : [];
    },
    rooms() {
      return this.tour?.feature?.room || [];
    },
    roomNames() {
      return this.rooms.map((r) => r && r.name).filter(Boolean);
    },
    hotelWithoutRooms() {
      return this.tour?.item === 'hotel' && this.roomNames.length === 0;
    },
    todayText() {
      return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
    },
    services() {
      return (this.tour?.feature?.service || []).filter((s) => s && s.item);
    },
    about() {
      return this.tour?.feature?.about || {};
    },
    menu() {
      return this.tour?.feature?.menu || [];
    },
    opening() {
      return this.tour?.feature?.opening || [];
    },
  },
  created() {
    this.load();
  },
  methods: {
    async load() {
      try {
        this.tour = await get_tour_detail(this.$route.params.tour_id);
        if (this.tour) {
          this.initOrderForm();
          // 評論、玩法、資格失敗不影響詳情顯示
          await Promise.allSettled([this.loadReviews(), this.loadShares(), this.loadEligibility()]);
        }
      } catch (err) {
        this.tour = null;
        this.error = true;
      } finally {
        this.loaded = true;
      }
    },
    initOrderForm() {
      const start = this.tour.date_start ? String(this.tour.date_start).slice(0, 10) : this.todayText;
      const end = this.tour.date_end ? String(this.tour.date_end).slice(0, 10) : start;
      this.orderForm.startDate = start < this.todayText ? this.todayText : start;
      this.orderForm.endDate = end < this.orderForm.startDate ? this.orderForm.startDate : end;
      this.orderForm.startDateTime = `${this.orderForm.startDate}T12:00`;
      this.orderForm.roomType = this.roomNames[0] || '';
    },
    async addToCart() {
      if (!userStore.isLoggedIn) {
        this.$router.push('/admin/login');
        return;
      }
      if (this.adding) return;
      const f = this.orderForm;
      let options;
      if (this.tour.item === 'food') {
        options = { start_date: f.startDateTime };
      } else {
        options = { start_date: f.startDate, end_date: f.endDate };
        if (this.tour.item === 'hotel') options.room_type = f.roomType;
      }
      this.adding = true;
      try {
        await post_cart_item(this.tour.tour_id || this.$route.params.tour_id, {
          type: this.tour.type,
          item: this.tour.item,
          people: f.people,
          options,
        });
        Swal.fire({
          icon: 'success',
          title: '已加入購物車',
          scrollbarPadding: false,
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (err) {
        // 錯誤提示已由 api 層顯示
      } finally {
        this.adding = false;
      }
    },
    async loadReviews() {
      const data = await get_tour_reviews(this.$route.params.tour_id, 1, PAGE_SIZE);
      this.averageRating = Number(data.average_rating) || 0;
      this.reviews = data.reviews ?? [];
      this.reviewPage = 1;
      this.hasMoreReviews = this.reviews.length === PAGE_SIZE;
    },
    async loadMoreReviews() {
      if (this.loadingMoreReviews) return;
      this.loadingMoreReviews = true;
      try {
        const data = await get_tour_reviews(this.$route.params.tour_id, this.reviewPage + 1, PAGE_SIZE);
        const more = data.reviews ?? [];
        this.reviews = [...this.reviews, ...more];
        this.reviewPage += 1;
        this.hasMoreReviews = more.length === PAGE_SIZE;
      } catch (err) {
        // 失敗時保留現有列表，可再按一次
      } finally {
        this.loadingMoreReviews = false;
      }
    },
    async loadShares() {
      const data = await get_tour_hidden_shares(this.$route.params.tour_id, 1, PAGE_SIZE);
      this.shares = data;
      this.sharePage = 1;
      this.hasMoreShares = data.length === PAGE_SIZE;
    },
    async loadMoreShares() {
      if (this.loadingMoreShares) return;
      this.loadingMoreShares = true;
      try {
        const data = await get_tour_hidden_shares(this.$route.params.tour_id, this.sharePage + 1, PAGE_SIZE);
        this.shares = [...this.shares, ...data];
        this.sharePage += 1;
        this.hasMoreShares = data.length === PAGE_SIZE;
      } catch (err) {
        // 失敗時保留現有列表，可再按一次
      } finally {
        this.loadingMoreShares = false;
      }
    },
    async loadEligibility() {
      try {
        this.eligibility = await get_tour_eligibility(this.$route.params.tour_id);
      } finally {
        this.eligibilityLoaded = true;
      }
    },
    async afterWrite(title) {
      await Promise.allSettled([this.loadReviews(), this.loadShares(), this.loadEligibility()]);
      Swal.fire({ icon: 'success', title, scrollbarPadding: false, timer: 1500, showConfirmButton: false });
    },
    async submitReview() {
      this.submitting = true;
      try {
        await post_tour_review(this.$route.params.tour_id, {
          rating: this.reviewForm.rating,
          content: this.reviewForm.content,
        });
        this.reviewForm = { rating: 5, content: '' };
        await this.afterWrite('評論成功');
      } catch (err) {
        // 錯誤提示已由 api.js 處理；409 代表已評論過，重讀資格讓表單換成提示
        if (err?.response?.status === 409) await this.loadEligibility();
      } finally {
        this.submitting = false;
      }
    },
    async submitShare() {
      this.submitting = true;
      try {
        await post_tour_hidden_share(this.$route.params.tour_id, { ...this.shareForm });
        this.shareForm = { title: '', content: '', url: '' };
        await this.afterWrite('分享成功');
      } catch (err) {
        // 錯誤提示已由 api.js 處理
      } finally {
        this.submitting = false;
      }
    },
    formatPrice(x) {
      return `NT$${Number(x).toLocaleString('en-US')}`;
    },
    dateText(d) {
      return d ? String(d).slice(0, 10) : '自由選擇';
    },
    // 評論／玩法的建立時間是 timestamptz：以 Asia/Taipei 換算成 YYYY-MM-DD（避免 00:00–08:00 顯示前一天）
    createdText(d) {
      const date = d ? new Date(d) : null;
      if (!date || Number.isNaN(date.getTime())) return '';
      return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
    },
    // 只允許 http／https，其餘（javascript: 等）一律不當連結
    safeUrl(u) {
      return typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : '';
    },
  },
};
</script>

<style scoped>
@import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css');

.container {
  max-width: 1200px;
}
.c-title {
  font-size: 1.4rem;
  font-weight: bold;
  border-left: 5px solid #0d6efd;
  padding-left: 10px;
  margin-bottom: 1rem;
}
.illustrate {
  white-space: pre-line;
}
</style>
