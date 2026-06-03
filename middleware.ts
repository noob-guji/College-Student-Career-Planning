/**
 * middleware.ts
 * 必须放在项目根目录（与 src/ 同级，即 package.json 旁边）
 * 这是路由保护失效的根本原因：没有此文件，auth.config.ts 的 authorized 回调永远不会执行
 */
export { auth as middleware } from "@/lib/auth"

export const config = {
  // 匹配所有需要保护的路径，排除静态资源和 API 路由
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
