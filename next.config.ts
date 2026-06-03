import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // @met4citizen/talkinghead 内部使用动态 import(moduleName) 拼接路径加载 lipsync 模块
  // Turbopack 无法解析变量拼接的 import(), 需要将该包加入 transpilePackages 处理
  transpilePackages: ["@met4citizen/talkinghead"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
