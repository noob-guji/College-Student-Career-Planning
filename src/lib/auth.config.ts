import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user

      // 已登录用户访问 /auth 直接跳转首页
      if (isLoggedIn && nextUrl.pathname.startsWith("/auth")) {
        return Response.redirect(new URL("/home", nextUrl))
      }

      const protectedPaths = [
        "/home",
        "/profile",
        "/roles",
        "/self-cognition",
        "/person-post-matching",
        "/settings",
        // 新增页面保护
        "/career-blueprint",
        "/job-graph",
        "/knowledge-hub",
        "/ai-engine",
      ]

      const isProtectedRoute = protectedPaths.some(path =>
        nextUrl.pathname.startsWith(path)
      )

      if (isProtectedRoute) {
        if (isLoggedIn) return true
        return false // 重定向到登录页
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
