<template>
  <div class="wrap">
    <HeaderComponent />

    <main class="collect container">
      <h1 class="collect-title">我的收藏</h1>

      <p v-if="loading" class="collect-hint">載入中…</p>
      <p v-else-if="loadFailed" class="collect-hint" data-testid="load-error">載入失敗，請稍後再試</p>
      <div v-else-if="items.length === 0" class="collect-empty">
        <p>還沒有收藏的行程</p>
        <router-link to="/search">去逛逛</router-link>
      </div>
      <template v-else>
        <p v-if="total > 100" class="collect-hint">只顯示最新 100 筆收藏</p>
        <ul class="collect-list">
          <li
            v-for="item in items"
            :key="item.favorite_id"
            class="collect-card"
            :class="{ unlisted: isUnlisted(item) }"
            data-testid="favorite-card"
            @click="openTour(item)"
          >
            <img :src="item['旅遊代表圖 Url']" :alt="item['旅遊名稱']" />
            <div class="collect-body">
              <h3>{{ item['旅遊名稱'] }}</h3>
              <span v-if="isUnlisted(item)" class="collect-badge">已下架</span>
            </div>
            <button type="button" class="collect-remove" @click.stop="remove(item)">取消收藏</button>
          </li>
        </ul>
      </template>
    </main>

    <FooterComponent />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import HeaderComponent from '@/components/HeaderComponent.vue';
import FooterComponent from '@/components/FooterComponent.vue';
import { get_favorites, delete_favorite } from '@/utils/api.js';

const router = useRouter();
const items = ref([]);
const total = ref(0);
const loading = ref(true);
const loadFailed = ref(false);
const removing = new Set();

function isUnlisted(item) {
  return item['上下架狀態'] !== 1;
}

function openTour(item) {
  if (isUnlisted(item)) return;
  router.push({ name: 'tour', params: { tour_id: item['旅遊編號'] } });
}

async function load() {
  try {
    const res = await get_favorites();
    items.value = res.data;
    total.value = res.total;
  } catch {
    // 401 已由 api.js 導回登入頁；其他錯誤框由 api.js 顯示
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

async function remove(item) {
  const id = item.favorite_id;
  if (removing.has(id)) return;
  removing.add(id);
  try {
    await delete_favorite(id);
    items.value = items.value.filter((x) => x.favorite_id !== id);
    total.value = Math.max(0, total.value - 1);
  } catch {
    // 錯誤框由 api.js 顯示，卡片維持原樣
  } finally {
    removing.delete(id);
  }
}

onMounted(load);
</script>

<style scoped>
.collect {
  min-height: 60vh;
  padding: 32px 0;
}
.collect-title {
  font-size: 28px;
  margin-bottom: 24px;
}
.collect-hint,
.collect-empty {
  text-align: center;
  color: #666;
  margin: 24px 0;
}
.collect-list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 16px;
}
.collect-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  cursor: pointer;
}
.collect-card.unlisted {
  cursor: default;
  opacity: 0.6;
  filter: grayscale(1);
}
.collect-card img {
  width: 160px;
  height: 96px;
  object-fit: cover;
  border-radius: 6px;
}
.collect-body {
  flex: 1;
  text-align: left;
}
.collect-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: #666;
  color: #fff;
  font-size: 14px;
}
.collect-remove {
  border: 1px solid #333;
  background: #fff;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
}
</style>
