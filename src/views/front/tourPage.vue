<template>
  <div class="wrap">
    <div v-if="loaded && !tour" class="container my-5 text-center">
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
          <button type="button" class="btn btn-primary" disabled>加入購物車（即將開放）</button>
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
    </div>
  </div>
</template>

<script>
import { get_tour_detail } from '@/utils/api.js';

export default {
  name: 'tourPage',
  data() {
    return { tour: null, loaded: false };
  },
  computed: {
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
      } catch (err) {
        this.tour = null;
      } finally {
        this.loaded = true;
      }
    },
    formatPrice(x) {
      return `NT$${Number(x).toLocaleString('en-US')}`;
    },
    dateText(d) {
      return d ? String(d).slice(0, 10) : '自由選擇';
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
