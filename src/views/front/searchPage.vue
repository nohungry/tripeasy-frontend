<template>
  <div class="wrap">
    <!-- Header -->
    <HeaderComponent />

  <div class="container-fluid px-0">
      <div class="hero-banner d-flex align-items-center justify-content-center">
        <div class="container top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-end px-4 px-md-5">
            <h2 class="main-title text-white fw-bold text-center pe-5 pe-md-9 flex-grow-1 text-shadow-lg">
                購物專區
            </h2>
            <div class="verse-container d-flex flex-row-reverse align-items-start pe-3">
                <p class="right-text">
                世界這麼大、<br />
                不必走得太遠<br />
                也能遇見<br />
                讓你心動的風景
                </p>
                <p class="right-text me-5">
                跟著我們<br />
                把每一次出走<br />
                變成生活裡<br />
                最溫柔的片段
                </p>
            </div>
        </div>
      </div>

    <!-- 搜尋區+商品清單區+分頁器 -->
      <div class="main-content">
        <a href="#" style="text-decoration: none; color: #5b5b5b">首頁</a> /
        <a
          href="#"
          style="text-decoration: none; color: #5b5b5b; font-weight: 700"
          >購物專區</a
        >

        <!-- 搜尋區 -->
        <div class="bg-white py-4">
          <div class="container">
            <!-- 金額 -->
            <div class="row g-3 align-items-end mb-3">
              <div class="col-12 col-md-6">
                <div class="d-flex align-items-center">
                  <label class="form-label mb-0 me-3" style="white-space: nowrap"
                    >購買金額</label
                  >
                  <input
                    type="number"
                    class="form-control"
                    placeholder="最小金額"
                    v-model.number="filters.minPrice"
                    style="width: 180px"
                  />
                  <span class="mx-1"> – </span>
                  <input
                    type="number"
                    class="form-control"
                    placeholder="最大金額"
                    v-model.number="filters.maxPrice"
                    style="width: 180px"
                  />
                </div>
              </div>
            </div>

            <!-- 日期區間 -->
            <div class="row g-3 align-items-end mb-3">
              <div class="col-12 col-md-6">
                <div class="d-flex align-items-center">
                  <label class="form-label mb-0 me-3" style="white-space: nowrap"
                    >旅遊日期</label
                  >
                  <div class="flex-grow-1 me-0">
                    <input
                      type="date"
                      class="form-control"
                      v-model="filters.startDate"
                      style="width: 180px"
                    />
                  </div>
                  <span class="mx-1"> – </span>
                  <div class="flex-grow-1 ms-0">
                    <input
                      type="date"
                      class="form-control"
                      v-model="filters.endDate"
                      style="width: 180px"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 天數 -->
            <div class="row g-3 align-items-end mb-3">
              <div class="col-6 col-md-3">
                <div class="d-flex align-items-center">
                  <label class="form-label mb-0 me-3" style="white-space: nowrap"
                    >旅遊天數</label
                  >
                  <select
                    class="form-select"
                    v-model="filters.days"
                    style="width: 180px"
                  >
                    <option value="">不限</option>
                    <option v-for="n in 10" :key="n" :value="String(n)">{{ n }}日</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 關鍵字 -->
            <div class="row g-3 align-items-end mb-3">
              <div class="col-12 col-md-6">
                <div class="d-flex align-items-center">
                  <label
                    class="form-label mb-0"
                    style="white-space: nowrap; margin-right: 2em"
                    >關鍵字</label
                  >
                  <input
                    type="text"
                    class="form-control"
                    placeholder="請輸入關鍵字（標題或介紹）"
                    v-model="filters.keyword"
                    style="width: 376px"
                  />
                </div>
              </div>
            </div>

            <!-- 搜尋 -->
            <div class="col-12 col-md-12 text-end">
              <button class="btn btn-outline-dark mt-4 btn-oval" @click="fetchPage(1)">
                搜尋
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 排序與每頁顯示數量控制列 -->
      <div class="container d-flex justify-content-between align-items-center my-3">
          <!-- 每頁顯示筆數選單 -->
          <div class="d-flex align-items-center">
            <select v-model="itemsPerPage" @change="fetchPage(1)" aria-label="每頁筆數" class="form-select form-select-lg" style="width: 180px;">
              <option :value="2">筆數：2</option>
              <option :value="4">筆數：4</option>
              <option :value="6">筆數：6</option>
            </select>
          </div>
          <!-- 金額排序選單 -->
          <div class="d-flex align-items-center">
            <select v-model="sortOrder" @change="fetchPage(1)" aria-label="金額排序" class="form-select form-select-lg" style="width: 180px;">
              <option :value="null">金額排序</option>
              <option value="asc">金額升序 ▲</option>
              <option value="desc">金額降序 ▼</option>
            </select>
          </div>
        </div>

    <!-- 商品清單區 -->
  <div class="container my-5">
      <div class="row gy-4">
        <div v-if="loading" class="col-12 text-center text-muted">載入中…</div>
        <div v-else-if="loadFailed" class="col-12 text-center text-danger">載入失敗，請稍後再試</div>
        <div v-else-if="items.length === 0" class="col-12 text-center text-muted">查無符合條件的行程</div>
        <div
          class="col-12"
          v-for="item in items"
          :key="item['旅遊編號']"
          data-testid="tour-card"
        >
          <div class="d-flex bg-white rounded shadow-sm overflow-hidden">

            <!-- 圖片 -->
            <img :src="item['旅遊代表圖 Url']" :alt="item['旅遊名稱']" class="img-fluid" style="object-fit: cover; max-width: 280px;" />

            <!-- 內容 -->
            <div class="p-3 flex-grow-1">

                <!-- 標籤（搜尋 API 的鍵是 tags，首頁才是 偏好分類） -->
                <div>
                  <span
                    v-for="(tag, index) in item.tags ?? []"
                    :key="tag"
                    class="badge me-1"
                    :class="tagClasses[index % tagClasses.length]"
                    >{{ tag }}</span
                  >
                </div>

              <div class="d-flex">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center mb-1">
                    <h5 class="mb-0">{{ item['旅遊名稱'] }}</h5>
                  </div>
                  <p class="mb-2 small text-start">{{ item['旅遊描述'] }}</p>
                </div>

                <!-- 右側：日期/價格/按鈕 -->
                <div class="text-end ms-3" style="min-width: 210px;">
                  <div>{{ formatDateRange(item) }}</div>
                  <div class="price-custom mt-2 mb-1">
                    {{ formatPrice(item['促銷價錢'] ?? item['價錢']) }}
                  </div>
                  <small
                    v-if="item['促銷價錢'] != null"
                    class="text-muted text-decoration-line-through d-block mb-2"
                  >
                    {{ formatPrice(item['價錢']) }}
                  </small>
                  <router-link
                    class="btn btn-outline-dark btn-sm"
                    :to="{ name: 'tour', params: { tour_id: item['旅遊編號'] } }"
                    >查看詳情</router-link
                  >
                </div>

              </div>

            </div>

          </div>
        </div>
      </div>

      <!-- 分頁器（API 沒有總頁數：筆數等於每頁筆數就視為可能還有下一頁） -->
      <nav class="d-flex justify-content-center align-items-center mt-4 gap-3" aria-label="分頁">
        <button class="btn btn-outline-dark" :disabled="currentPage === 1 || loading" @click="fetchPage(currentPage - 1)">上一頁</button>
        <span>第 {{ currentPage }} 頁</span>
        <button class="btn btn-outline-dark" :disabled="!hasNext || loading" @click="fetchPage(currentPage + 1)">下一頁</button>
      </nav>
    </div>
  </div>

    <!-- Footer -->
    <FooterComponent />
  </div>
</template>


<script setup>
import FooterComponent from '@/components/FooterComponent.vue';
import HeaderComponent from '@/components/HeaderComponent.vue';
import { reactive, computed, ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { get_tour_list } from '@/utils/api.js';

const route = useRoute();

const filters = reactive({
  days: '', // 天數
  keyword: '', // 關鍵字
  minPrice: null, // 最小金額
  maxPrice: null, // 最大金額
  startDate: '', // 起始日期 YYYY-MM-DD
  endDate: '', // 結束日期 YYYY-MM-DD
});

const sortOrder = ref(null); // null=依日期, 'asc'=金額升序, 'desc'=金額降序
const itemsPerPage = ref(6);
const currentPage = ref(1);
const items = ref([]);
const loading = ref(false);
const loadFailed = ref(false);
const hasNext = computed(() => items.value.length === itemsPerPage.value);

const tagClasses = ['bg-warning text-dark', 'bg-secondary text-white', 'bg-danger text-white'];

const sortParams = {
  null: { sort_by: 'date', order: 'asc' },
  asc: { sort_by: 'price', order: 'asc' },
  desc: { sort_by: 'price', order: 'desc' },
};

function buildQuery(page) {
  return {
    page,
    limit: itemsPerPage.value,
    ...sortParams[sortOrder.value],
    keyword: filters.keyword.trim(),
    min_price: filters.minPrice,
    max_price: filters.maxPrice,
    start_date: filters.startDate,
    end_date: filters.endDate,
    duration: filters.days,
  };
}

// 只採用最後一次請求的結果，避免較慢的舊回應蓋掉新結果
let requestSeq = 0;
async function fetchPage(page) {
  const seq = ++requestSeq;
  loading.value = true;
  loadFailed.value = false;
  try {
    const rows = await get_tour_list(buildQuery(page));
    if (seq !== requestSeq) return;
    items.value = rows;
    currentPage.value = page;
  } catch (error) {
    if (seq !== requestSeq) return;
    items.value = [];
    loadFailed.value = true;
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function applyRouteKeyword() {
  const keyword = route.query.keyword;
  filters.keyword = typeof keyword === 'string' ? keyword : '';
  fetchPage(1);
}

onMounted(applyRouteKeyword);
watch(() => route.query.keyword, applyRouteKeyword);

function formatPrice(value) {
  return `NT$${Number(value).toLocaleString('en-US')}`;
}

// 顯示用日期格式（NULL 顯示「自由選擇」）
function formatDateRange(item) {
  const start = item['旅遊開始日期'];
  const end = item['旅遊結束日期'];
  if (!start || !end) return '自由選擇';
  const format = (d) => String(d).slice(0, 10).replaceAll('-', '.');
  return `${format(start)} ~ ${format(end)}`;
}
</script>

<style scoped>
body {
  background-color: #f9f9f9;
}

.main-content{
  max-width: 1296px;
  margin-left: auto;
  margin-right: auto;
}

.hero-banner {
  height: 450px;
  background-image: url('@/assets/img/search/banner.jpg');
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  overflow: hidden;
}

.main-title {
  font-size: 3.8rem;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.8);
}

.right-text {
  color: white;
  font-size: 1.1rem;
  line-height: 1.5;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
  writing-mode: vertical-lr;
  text-orientation: upright;
}
.img-fluid{
  width: 332px;
  height: 192px;
}


.favorite-icon {
  cursor: pointer;
  color: #aaa;
  transition: color 0.3s;
}

.favorite-icon.active {
  color: red;
}

.price-custom {
  font-size: 24px;
  font-weight: 700;
  font-family: 'Noto Serif TC', serif;
  color: red;
  letter-spacing: 1px;
  text-align: right;
}


</style>
