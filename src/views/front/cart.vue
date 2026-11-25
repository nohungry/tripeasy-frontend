<template>
  <div class="wrap">
    <!-- Header -->
    <HeaderComponent />

    <!-- Content -->
    <div class="content">
      <div class="container">
        <!-- 序列 -->
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item active">購物車</li>&nbsp;
                <li class="breadcrumb-item">填寫訂購資料</li>&nbsp;
                <li class="breadcrumb-item" aria-current="page">確認付款</li>
            </ol>
        </nav>

        <h3 class="fw-bold my-4">購物車</h3>

        <p v-if="loading" class="text-muted">載入中…</p>

        <div v-else-if="loadError" class="text-center text-muted py-5" data-testid="cart-load-error">
          購物車載入失敗，請重新整理頁面
        </div>

        <div v-else-if="items.length === 0" class="text-center text-muted py-5" data-testid="cart-empty">
          購物車是空的
        </div>

        <template v-else>
          <div v-for="row in items" :key="row.cart_item_id" class="cart-card d-flex" data-testid="cart-item">
            <div class="product-image me-3">
              <img v-if="row.image_url" :src="row.image_url" :alt="row.title" class="img-fluid" />
              <span v-else>無圖片</span>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="product-title">{{ row.title }}</div>
                  <div v-if="row.options.room_type" class="small text-muted">{{ row.options.room_type }}</div>
                </div>
                <div>
                  <div class="mb-1"><small>出發日期：{{ dateText(row.options.start_date) }}</small></div>
                </div>
                <div>
                  <label class="small me-1" :for="'people-' + row.cart_item_id">人數</label>
                  <input
                    :id="'people-' + row.cart_item_id"
                    type="number"
                    min="1"
                    step="1"
                    class="form-control form-control-sm d-inline-block people-input"
                    :value="row.options.people"
                    :disabled="busy"
                    @change="changePeople(row, $event)"
                  />
                </div>
                <div>
                  <div class="fw-bold">{{ formatPrice(row.total_price) }}</div>
                </div>
                <div class="text-end">
                  <button type="button" class="btn btn-outline-danger btn-sm" :disabled="busy" @click="removeItem(row)">移除</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 總金額區塊 -->
          <div class="total-section d-flex justify-content-between align-items-center">
            <div>共 {{ summary.total_items }} 個行程</div>
            <div class="fs-5 fw-bold">總金額 <span data-testid="cart-total">{{ formatPrice(summary.total_price) }}</span></div>
            <button type="button" class="btn btn-dark" :disabled="busy" @click="checkout">去結帳</button>
          </div>
        </template>
      </div>
    </div>
    <!-- Footer -->
    <!-- <FooterComponent /> -->
  </div>
</template>


<script>
import HeaderComponent from '@/components/HeaderComponent.vue';
import Swal from 'sweetalert2';
import { userStore } from '@/stores/userStore.js';
import { get_cart_list, patch_cart_item, delete_cart_item, post_order } from '@/utils/api.js';

export default {
  name: 'cart',
  components: { HeaderComponent },
  data() {
    return {
      items: [],
      summary: { total_items: 0, total_price: 0 },
      cartId: null,
      loading: true,
      loadError: false,
      busy: false,
    };
  },
  async mounted() {
    if (!userStore.isLoggedIn) {
      this.$router.replace('/admin/login');
      return;
    }
    await this.reload();
    this.loading = false;
  },
  methods: {
    async reload() {
      try {
        const res = await get_cart_list();
        this.items = res.data || [];
        this.summary = res.summary || { total_items: 0, total_price: 0 };
        this.cartId = this.items[0]?.cart_id ?? null;
        this.loadError = false;
      } catch (err) {
        // 錯誤提示已由 api 層顯示；載入失敗不能顯示成「購物車是空的」
        this.loadError = true;
      }
    },
    async changePeople(row, event) {
      const people = Math.floor(Number(event.target.value));
      if (!Number.isFinite(people) || people < 1) {
        event.target.value = row.options.people;
        return;
      }
      if (people === row.options.people) return;
      const options =
        row.item === 'food'
          ? { start_date: String(row.options.start_date).slice(0, 16) }
          : {
              start_date: String(row.options.start_date).slice(0, 10),
              end_date: String(row.options.end_date).slice(0, 10),
            };
      if (row.item === 'hotel') options.room_type = row.options.room_type;
      await this.run(() => patch_cart_item(row.cart_item_id, { type: row.type, item: row.item, people, options }));
    },
    async removeItem(row) {
      await this.run(() => delete_cart_item(row.cart_item_id));
    },
    async run(action) {
      if (this.busy) return;
      this.busy = true;
      try {
        await action();
      } catch (err) {
        // 錯誤提示已由 api 層顯示
      }
      try {
        await this.reload();
      } finally {
        this.busy = false;
      }
    },
    async checkout() {
      if (this.busy || !this.cartId) return;
      this.busy = true;
      try {
        const created = await post_order(this.cartId);
        const order_id = created?.order_id;
        if (!order_id) {
          Swal.fire({ icon: 'error', title: '建立訂單失敗', text: '未取得訂單編號，請稍後再試', scrollbarPadding: false });
          return;
        }
        this.$router.push({ name: 'pay', query: { order: order_id } });
      } catch (err) {
        // 錯誤提示已由 api 層顯示
      } finally {
        this.busy = false;
      }
    },
    formatPrice(x) {
      return `NT$${Number(x).toLocaleString('en-US')}`;
    },
    dateText(d) {
      return d ? String(d).slice(0, 10) : '';
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
  padding-top: 120px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  background-color: #fff;
  padding: 36px;
  border-radius: 30px
}

.cart-card {
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 20px;
}

.product-image {
    width: 100px;
    height: 100px;
    background-color: #e9ecef;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #666;
}

.people-input {
    width: 80px;
}

.product-title {
    font-weight: bold;
    font-size: 18px;
}

.total-section {
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 20px;
    margin-top: 30px;
}
</style>
