// 此脚本作为内联 <script> 注入 <head>，在 React 渲染前执行
// 防止主题闪烁（FOUC）
export const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('theme') || 'system';
    if (t === 'system') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch(e) {}
})();
`;
