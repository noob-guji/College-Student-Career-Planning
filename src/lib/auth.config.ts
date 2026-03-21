import type { NextAuthConfig } from "next-auth"

// 这里只包含与数据库无关的配置，以便在 Middleware (Edge Runtime) 中运行
export const authConfig = {
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtectedRoute = [
        "/home",
        "/profile",
        "/roles",
        "/self-cognition",
        "/person-post-matching",
        "/settings"
      ].some(path => nextUrl.pathname.startsWith(path))

      if (isProtectedRoute) {
        if (isLoggedIn) return true
        return false // 重定向到登录页
      }
      return true
    },
  },
  providers: [], // 在 auth.ts 中再添加真正的 provider
} satisfies NextAuthConfig
