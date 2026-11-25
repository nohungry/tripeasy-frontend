<template>
  <div class="wrap">
    <!-- Header -->
    <HeaderComponent />

    <!-- Content -->
    <div class="content">
      <div class="container">
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">購物車</li>
            <li class="breadcrumb-item active" aria-current="page">填寫付款資料</li>
            <li class="breadcrumb-item">確認付款</li>
          </ol>
        </nav>

        <div class="row">
          <!-- 左側：填寫付款資料 -->
          <div class="col-lg-6">
            <h3 class="mb-4 fw-bold">填寫付款資料</h3>
            <form id="pay" @submit.prevent="submit">
              <!-- 訂購人資訊 -->
              <div class="mb-3">
                <label for="name" class="form-label">全名</label>
                <input type="text" class="form-control" id="name" v-model="form.name" placeholder="請輸入全名">
              </div>
              <div class="mb-3">
                <label for="email" class="form-label">email</label>
                <input type="email" class="form-control" id="email" v-model="form.email" placeholder="請輸入 email">
              </div>
              <div class="row g-3">
                <div class="col-md-6">
                  <label for="location" class="form-label">地址</label>
                  <input type="text" class="form-control" id="location" v-model="form.address" placeholder="請輸入地址">
                </div>
                <div class="col-md-6">
                  <label for="phone" class="form-label">連絡電話</label>
                  <input type="tel" class="form-control" id="phone" v-model="form.phone" placeholder="請輸入連絡電話">
                </div>
              </div>

              <div class="mt-4">
                <label class="form-label d-block">付款方式</label>
                <div class="form-control-plaintext">信用卡</div>
              </div>

              <!-- 使用折扣優惠 -->
              <div class="mt-4">
                <label class="form-label d-block">使用折扣優惠</label>
                <div class="form-check">
                  <input class="form-check-input" type="radio" name="discountType" id="discount-none" value="none" v-model="discountType" @change="onTypeChange">
                  <label class="form-check-label" for="discount-none">不使用</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="radio" name="discountType" id="coupon" value="coupon" v-model="discountType" @change="onTypeChange">
                  <label class="form-check-label" for="coupon">優惠卷</label>
                </div>
                <div v-if="discountType === 'coupon'" class="mb-3">
                  <select class="form-select" data-testid="coupon-select" aria-label="選擇優惠卷" v-model="couponId" @change="onSelect">
                    <option value="" disabled>請選擇優惠卷</option>
                    <option v-for="c in coupons" :key="c.coupon_id" :value="c.coupon_id">{{ c.code }} {{ c.description }}</option>
                  </select>
                  <div v-if="coupons.length === 0" class="form-text">目前沒有可用的優惠卷</div>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="radio" name="discountType" id="point" value="point" v-model="discountType" @change="onTypeChange">
                  <label class="form-check-label" for="point">旅遊積分</label>
                </div>
                <div v-if="discountType === 'point'" class="mb-3">
                  <input type="number" class="form-control" data-testid="point-input" aria-label="使用積分" step="5" min="0" v-model.number="usedPoint" @change="onSelect">
                  <div class="form-text">可用積分 {{ points }} 點</div>
                </div>
              </div>

              <button type="submit" class="btn btn-dark mt-4 w-100" :disabled="busy || !loaded">
                確認並前往付款
              </button>
            </form>
          </div>

            <!-- 右側：訂單資訊 -->
            <div class="col-lg-5">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h5 class="fw-bold mb-3">訂單資料</h5>
                        <div v-for="o in orders" :key="o.tour_id + String(o.options.start_date)" class="card mb-3 order-card">
                            <div class="row g-0">
                                <div class="col-4">
                                    <img :src="o.cover_image" class="img-fluid rounded-start" :alt="o.title">
                                </div>
                                <div class="col-8">
                                    <div class="card-body">
                                        <h6 class="card-title">{{ o.title }}</h6>
                                        <p class="card-text mb-1">
                                            <span class="fw-bold">{{ money(o.total_price) }}</span>
                                        </p>
                                        <p class="card-text mb-1" v-if="o.options.start_date">
                                            <i class="bi bi-calendar-event"></i> {{ day(o.options.start_date) }}<template v-if="o.options.end_date"> ~ {{ day(o.options.end_date) }}</template>
                                        </p>
                                        <p class="card-text">
                                            <i class="bi bi-people"></i> {{ o.options.people }} 人
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr>

                        <div class="d-flex justify-content-between mb-2">
                            <span>原價</span><span data-testid="pay-total">{{ money(sum.total_price) }}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>促銷後</span><span data-testid="pay-promo">{{ money(sum.promo_subtotal) }}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>折抵</span><span data-testid="pay-discount">{{ money(sum.discount_amount) }}</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span class="fw-bold">應付金額</span>
                            <span class="fw-bold fs-5 text-danger" data-testid="pay-payable">{{ money(sum.payable) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

    </div>
    <!-- Footer -->
    <FooterComponent />
  </div>
</template>


<script>
import HeaderComponent from '@/components/HeaderComponent.vue';
import FooterComponent from '@/components/FooterComponent.vue';
import {
  get_checkout_userinfo,
  get_checkout_summary,
  get_points_coupons,
  post_discount_trial,
  cancel_discount,
  patch_checkout_preview,
  post_payment,
} from '@/utils/api.js';

export default {
  name: 'payPage',
  components: { HeaderComponent, FooterComponent },
  data() {
    return {
      orderId: '',
      form: { name: '', email: '', address: '', phone: '' },
      points: 0,
      coupons: [],
      discountType: 'none',
      couponId: '',
      usedPoint: 0,
      orders: [],
      sum: { total_price: 0, promo_subtotal: 0, discount_amount: 0, payable: 0 },
      busy: false,
      loaded: false, // 初始載入（預填資料、金額）完成前不可送出
      seq: 0, // 金額請求序號，只採用最新一次的回應
      pendingTrial: null,
    };
  },
  async mounted() {
    const orderId = this.$route.query.order;
    if (!orderId) {
      this.$router.replace('/cart');
      return;
    }
    this.orderId = String(orderId);
    const mySeq = ++this.seq;
    try {
      const [info, pc, summary] = await Promise.all([
        get_checkout_userinfo(this.orderId),
        get_points_coupons(),
        get_checkout_summary(this.orderId),
      ]);
      // 只在使用者還沒輸入時預填，避免載入完成後蓋掉已輸入的內容
      this.form.name = this.form.name || (info?.name ?? '');
      this.form.email = this.form.email || (info?.email ?? '');
      this.points = pc.points;
      this.coupons = pc.coupons;
      this.orders = summary.orders ?? [];
      if (mySeq === this.seq) this.sum = summary.summary;
      // 重新付款時，訂單可能已保留折扣，讓畫面與保留一致
      const d = summary.discount;
      if (d?.type === 'coupon' && d.coupon_id) {
        this.discountType = 'coupon';
        this.couponId = d.coupon_id;
      } else if (d?.type === 'point') {
        this.discountType = 'point';
        this.usedPoint = d.used_point ?? 0;
      }
      this.loaded = true;
    } catch (error) {
      // 錯誤提示已由 api 層顯示；載入失敗時維持不可送出
    }
  },
  methods: {
    money(x) {
      return `NT$${Number(x || 0).toLocaleString('en-US')}`;
    },
    day(x) {
      return String(x).slice(0, 10).replace(/-/g, '/');
    },
    async onSelect() {
      await this.$nextTick(); // 等 v-model 先更新
      await this.trial();
    },
    async onTypeChange() {
      await this.$nextTick(); // 等 v-model 先更新
      if (this.discountType === 'coupon' && !this.couponId && this.coupons.length > 0) {
        this.couponId = this.coupons[0].coupon_id;
      }
      await this.trial();
    },
    trial() {
      this.pendingTrial = this.runTrial();
      return this.pendingTrial;
    },
    async runTrial() {
      const mySeq = ++this.seq;
      try {
        let data;
        const coupon = this.coupons.find((c) => c.coupon_id === this.couponId);
        if (this.discountType === 'none' || (this.discountType === 'coupon' && !coupon)) {
          // 沒有選用折扣（或沒有可選的優惠卷）：取消保留，金額回到未折扣
          data = await cancel_discount(this.orderId);
        } else if (this.discountType === 'coupon') {
          data = await post_discount_trial(this.orderId, { type: 'coupon', discount: { coupon: coupon.code } });
        } else {
          data = await post_discount_trial(this.orderId, { type: 'point', discount: { point: Number(this.usedPoint) || 0 } });
        }
        if (mySeq === this.seq) this.sum = data.summary;
      } catch (error) {
        // 錯誤提示已由 api 層顯示，金額維持原狀
      }
    },
    discountBody() {
      if (this.discountType === 'coupon' && this.couponId) return { type: 'coupon', coupon_id: this.couponId };
      if (this.discountType === 'point') return { type: 'point', used_point: Number(this.usedPoint) || 0 };
      return null; // 不使用折扣時不帶 discount（後端只接受 coupon／point）
    },
    async submit() {
      if (this.busy || !this.loaded) return;
      this.busy = true;
      try {
        if (this.pendingTrial) await this.pendingTrial; // 等進行中的折扣試算完成再送出
        const body = {
          user: {
            name: this.form.name,
            email: this.form.email,
            address: this.form.address,
            phone_number: this.form.phone,
          },
          payment_method: 'credit_card',
        };
        const discount = this.discountBody();
        if (discount) body.discount = discount;
        await patch_checkout_preview(this.orderId, body);
        const html = await post_payment(this.orderId);
        document.open();
        document.write(html);
        document.close();
      } catch (error) {
        // 錯誤提示已由 api 層顯示
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>





<style scoped>
@import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css');
@import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');

body {
    font-family: "Noto Sans TC", sans-serif;
    margin: 40px;
    color: #222;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 1.5rem 2rem;
  padding-top: 100px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  background-color: #fff;
  padding: 36px;
  border-radius: 30px
}

.order-card img {
    width: 100%;
    height: auto;
    background-color: #ccc;
}

.note {
    font-size: 0.875rem;
    color: #666;
}


</style>
