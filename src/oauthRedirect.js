// Google OAuth 會以 `/?code=...` 回跳到根網址，但本站路由是 hash 模式（`/#/...`）。
// 這段改寫必須獨立成模組，並且是 main.js 的第一個 import：
// ES module 會先執行所有 import，router/index.js 在被載入時就呼叫 createWebHashHistory，
// 它在建立當下就從網址（含 hash）讀走目前位置，之後 push/replace 只寫 `#...` 相對網址，
// 所以 `?code=...` 會一直留在 search。若等到 main.js 本文才 replaceState，router 已經以舊網址
// （hash 為空，視為 `/`）初始化，code 到不了登入頁。
// 只在帶 code 時改寫：把 code 搬進 hash 路由，其他 query 參數原樣留在 search；
// 沒有 code（例如使用者取消授權的 `?error=access_denied`）則完全不動。
const params = new URLSearchParams(window.location.search);
const code = params.get('code');
if (code) {
  params.delete('code');
  const rest = params.toString();
  window.history.replaceState(
    window.history.state,
    document.title,
    `${window.location.pathname}${rest ? `?${rest}` : ''}#/admin/login?code=${encodeURIComponent(code)}`
  );
}
