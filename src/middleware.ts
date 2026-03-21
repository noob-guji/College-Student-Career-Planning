import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

export default NextAuth(authConfig).auth

// 配置哪些路径会触发该中间件
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
