<template>
  <div class="wrap">
    <HeaderComponent />

    <div class="content">
      <div class="container text-center">
        <h3 class="fw-bold mb-4">付款結果</h3>

        <p v-if="state === 'noOrder'" class="fs-5">查無訂單</p>
        <p v-else-if="state === 'loading'" class="text-muted">確認付款結果中…</p>

        <template v-else-if="state === 'paid'">
          <p class="fs-4 fw-bold text-success">付款成功</p>
          <p>應付金額 <span data-testid="result-payable">{{ money(summary.payable) }}</span></p>
          <p>獲得旅遊積分 {{ summary.get_point }} 點</p>
        </template>

        <p v-else-if="state === 'expired'" class="fs-5">付款逾時</p>
        <p v-else-if="state === 'cancelled'" class="fs-5">訂單已取消</p>
        <p v-else-if="state === 'refunded'" class="fs-5">訂單已退款</p>
        <p v-else-if="state === 'other'" class="fs-5">訂單狀態：{{ summary.payment_status }}</p>

        <template v-else-if="state === 'unpaid'">
          <p class="fs-5">付款未完成</p>
          <button type="button" class="btn btn-dark" @click="retry">重新付款</button>
        </template>
      </div>
    </div>

    <FooterComponent />
  </div>
</template>

<script>
import HeaderComponent from '@/components/HeaderComponent.vue';
import FooterComponent from '@/components/FooterComponent.vue';
import { get_checkout_summary } from '@/utils/api.js';

const MAX_POLLS = 10;

export default {
  name: 'payResult',
  components: { HeaderComponent, FooterComponent },
  data() {
    return { orderId: '', state: 'loading', summary: {}, timer: null, polls: 0, stopped: false };
  },
  mounted() {
    const orderId = this.$route.query.order;
    if (!orderId) {
      this.state = 'noOrder';
      return;
    }
    this.orderId = String(orderId);
    this.poll();
  },
  beforeUnmount() {
    this.stopped = true;
    clearTimeout(this.timer);
  },
  methods: {
    money(x) {
      return `NT$${Number(x || 0).toLocaleString('en-US')}`;
    },
    // 每 1 秒查一次、最多 10 次；payment_status 不是 0 就停（等 notify 把狀態寫進來）
    async poll() {
      this.polls += 1;
      let status = 0;
      try {
        const data = await get_checkout_summary(this.orderId);
        this.summary = data.summary;
        status = data.summary.payment_status;
      } catch (error) {
        if (this.stopped) return;
        // 錯誤提示已由 api 層顯示；查不到訂單就不再輪詢
        this.state = 'noOrder';
        return;
      }
      if (this.stopped) return; // 離開頁面後不再更新或排程
      if (status === 1) this.state = 'paid';
      else if (status === 4) this.state = 'expired';
      else if (status === 2) this.state = 'cancelled';
      else if (status === 3) this.state = 'refunded';
      else if (status !== 0) this.state = 'other';
      else if (this.polls >= MAX_POLLS) this.state = 'unpaid';
      else this.timer = setTimeout(() => this.poll(), 1000);
    },
    retry() {
      this.$router.push({ name: 'pay', query: { order: this.orderId } });
    },
  },
};
</script>

<style scoped>
@import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css');

.content {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 1.5rem 2rem;
  padding-top: 100px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  background-color: #fff;
  padding: 36px;
  border-radius: 30px;
}
</style>
