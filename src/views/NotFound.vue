<template>
  <div class="not-found">
    <h1>找不到頁面</h1>
    <p>你要找的頁面不存在，或已經被移動。</p>
    <router-link to="/">回首頁</router-link>
  </div>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 120px 16px;
}
</style>
