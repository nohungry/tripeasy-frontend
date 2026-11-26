<template>
  <button
    type="button"
    class="favorite-heart"
    data-testid="favorite-heart"
    :aria-pressed="pressed ? 'true' : 'false'"
    :aria-label="pressed ? '取消收藏' : '加入收藏'"
    @click.stop.prevent="toggle"
  >
    <img v-if="pressed" src="@/assets/img/icon/favorite.svg" alt="" />
    <img v-else src="@/assets/img/icon/favorite-line.svg" alt="" />
  </button>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { userStore } from '@/stores/userStore.js';
import { post_favorite, delete_favorite } from '@/utils/api.js';

const props = defineProps({
  tourId: { type: String, required: true },
  favoriteId: { type: String, default: null },
});
const emit = defineEmits(['update:favoriteId']);
const router = useRouter();

const pressed = ref(!!props.favoriteId);
const currentId = ref(props.favoriteId ?? null);
let busy = false;

watch(
  () => props.favoriteId,
  (id) => {
    if (busy) return;
    currentId.value = id ?? null;
    pressed.value = !!id;
  }
);

async function toggle() {
  if (!userStore.isLoggedIn) {
    router.push('/admin/login');
    return;
  }
  if (busy) return;
  busy = true;
  const wasPressed = pressed.value;
  const previousId = currentId.value;
  // 先切換畫面，失敗再還原；錯誤框由 api.js 的 tradeRequest 顯示
  pressed.value = !wasPressed;
  try {
    if (wasPressed) {
      await delete_favorite(previousId);
      currentId.value = null;
    } else {
      const { favorite_id } = await post_favorite(props.tourId);
      currentId.value = favorite_id;
    }
    emit('update:favoriteId', currentId.value);
  } catch (error) {
    pressed.value = wasPressed;
    currentId.value = previousId;
  } finally {
    busy = false;
  }
}
</script>

<style scoped>
.favorite-heart {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  line-height: 0;
}
.favorite-heart:disabled {
  cursor: not-allowed;
}
</style>
