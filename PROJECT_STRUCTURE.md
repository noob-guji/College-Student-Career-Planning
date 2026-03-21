# 项目目录结构与文件作用说明

本文档详细记录了项目中各个文件及目录的作用与业务逻辑划分（基于 FSD 架构）。

## 📁 根目录配置与应用入口

- **`.env`**: 环境变量配置文件，包含数据库连接字符串及 NextAuth 相关的密钥等安全信息。
- **`.gitignore`**: Git 忽略配置文件，指定哪些文件（如 `node_modules`, `.env`, 构建产物）不被纳入版本控制。
- **`package.json`** / **`package-lock.json`**: 记录项目的 NPM 依赖、运行脚本（如 `dev`, `build` 等）以及包版本锁定信息。
- **`tsconfig.json`** / **`tsconfig.tsbuildinfo`**: TypeScript 编译配置文件，定义了严格模式、模块解析方式、以及 `@/*` 路径别名配置。
- **`next.config.ts`**: Next.js 核心配置文件，可配置路由重定向、环境变量透传、构建选项等。
- **`next-env.d.ts`**: Next.js 自动生成的 TypeScript 声明文件，确保编译器了解 Next.js 内置的类型。
- **`eslint.config.mjs`**: ESLint 代码检查规范配置。
- **`postcss.config.mjs`**: PostCSS 配置文件，搭配 TailwindCSS 框架进行 CSS 处理。
- **`auth.ts`** / **`auth.config.ts`**: NextAuth (Auth.js) 的核心配置文件，定义了登录校验策略、Session、JWT 回调等认证核心逻辑。
- **`proxy.ts`**: 本地代理配置文件，用于转发特定网络请求（通常用于解决跨域等网络调配问题）。
- **`fix-imports.js`**: 辅助性 Node.js 脚本，用来在架构重构期间批量修复旧代码中损坏的 import 路径。

---

## 📁 `app/` (App Router 页面视图与路由层)
这是 Next.js 13+ App Router 所在的目录，仅保管页面级的 UI 组装与 Server/Client 路由配置，不应再将复杂的组件和钩子放在此处。

### 页面级组件 (Views)
- **`app/layout.tsx`**: 全局根布局组件（RootLayout），包含全局 Context Provider 以及项目的整体 HTML 骨架。
- **`app/page.tsx`**: 根路径（`/`），系统默认的着陆页或重定向起点。
- **`app/globals.css`**: 全局总样式文件（主要包含了 TailwindCSS 的指令引入与基本样式）。
- **`app/(auth)/auth/page.tsx`**: 认证拦截路由视图，利用 Next.js 路由组实现鉴别，作为登录/注册页面的入口。
- **`app/(dashboard)/layout.tsx`**: 面板区内部布局规范，为已登录用户的界面提供统一排版（包括引入 Header 与 Sidebar）。
- **`app/(dashboard)/home/page.tsx`**: 核心主控台（Dashboard）首页入口。
- **`app/(dashboard)/person-post-matching/page.tsx`** 与 **`page.module.css`**: “人岗匹配”功能模块页面的独立入口及相关样式。
- **`app/(dashboard)/profile/page.tsx`**: 用户个人资料展示与修改的页面入口。
- **`app/(dashboard)/roles/page.tsx`**: 角色/岗位的分析页面入口。
- **`app/(dashboard)/self-cognition/page.tsx`**: “自我认知”及测评模块的入口。
- **`app/(dashboard)/settings/page.tsx`**: 系统或用户偏好设置界面入口。

### 后端 API 路由层 (Controllers)
- **`app/api/auth/[...nextauth]/route.ts`**: NextAuth 动态路由端点，接受与 Auth 相关的原生请求转发。
- **`app/api/auth/register/route.ts`**: 用户账号注册请求拦截端点，校验请求载荷并在确认安全后转交下层服务执行入库操作。

---

## 📁 `src/` (核心业务层 / 基于 Feature 切片)
此层作为真正的业务实现高内聚地带，隔离于框架路由之外。

### 📁 `src/components/` (标准化共享基础 UI)
存放跨不同业务能够全局复用的布局与组件。
- **`layout/Header.tsx`**: 通用顶部导航栏组件。
- **`layout/Sidebar.tsx`**: 通用侧边导航抽屉面板。

### 📁 `src/features/` (业务切片层)
核心的解耦理念，将各个独立业务逻辑按照实体域进行打包隔离：

1. **`auth/` (认证授权域)**
   - **`components/SlidingAuth.tsx`**: 囊括双面板动效逻辑的登录与注册表单的组件。
   - **`components/AuthProvider.tsx`**: NextAuth `SessionProvider` 的全局状态容器代理。

2. **`dashboard-core/` (核心看板面板业务)**
   - **`components/AIAssistantWidget.tsx`**: 悬浮或内嵌式的 AI 对话功能界面层。
   - **`components/SmartEditorTool.tsx`**: 智能文本编辑器组件，带有定制的富交互属性。

3. **`jobs/` (岗位/行业知识域)**
   - **`components/JobKnowledgeGraph.tsx`**: 核心的高级可视化组件，结合图谱数据生成直观的“职位-能力”联结。

4. **`matching-center/` (人岗匹配策略室)**
   - **`components/CapabilityInputForm.tsx`**: 用于引导录制和验证自我能力画像信息的长表单组件。
   - **`components/CapabilityPortraitDashboard.tsx`**: 用户个人现行竞争力档案、能力的复合型图表视窗。
   - **`components/BlueprintReport.tsx`**: 生成并输出长篇分析报告的排错器与内容版式。
   - **`components/JobProfileCard.tsx`**: 用于高度抽象单个工作岗位匹配度的通用卡片式展示。

5. **`self-cognition/` (自我探索域)**
   - **`components/MBTILanding.tsx`**: MBTI 测试的主引导或结果概览界组件。
   - **`components/MBTIModal.tsx`**: MBTI 测试或解析中的专用交互抽屉/模态框。
   - **`components/PersonalityDetailsModal.tsx`**: 对用户独特人格特质数据进一步分析解读视图的拓展弹窗。

### 📁 `src/data/` (静态资源配置与 Mock)
- **`jobsData.ts`**: 封装了庞大的节点关联数组等复杂关系图谱数据结构，用来驱动 `JobKnowledgeGraph` 展示交互式图表。

### 📁 `src/hooks/` (共享自定义钩子)
- **`useAIAssistant.ts`**: 用以被不同组件挂载使用的状态容器逻辑，隔离出了管理 AI 询问历史或状态切换的复杂操作。

### 📁 `src/lib/` (应用级核心驱动组件池)
- **`prisma.ts`**: Prisma ORM 实例单例封装管理中心，预防在非 SSR 构建模式下重复创建无数个 Prisma Client 断点。

### 📁 `src/server/` (纯净后端抽象层)
- **`services/auth.service.ts`**: 脱离任何 HTTP 概念或 Next.js API 写法绑定的内网核心业务代码。将“用户密码二次加密、比对验证数据库是否注册冲突，插入数据库”这些过程强封装对外暴露干净的静态接口。

---

## 📁 基础设施与资产挂载目录

- **`prisma/`**
  - **`schema.prisma`**: 最核心的 Prisma 框架元数据文档结构图，使用 Prisma 领域语言确立了数据表的形状和所有外键关联架构。
  - **`dev.db`**: SQLite 开发调试数据库。
- **`public/`**
  - Next.js 定死了其为全局公共资源的投放位置。
  - 存放有对外的页面徽标 `favicon.ico`，以及位于 `images/mbti/` 路径下用作自我认知报告相关展示的高清静态底图等。
- **`plan/`** 与所有遗余的 **`*.txt`, `*.log`文件**:
  - 开发进程与重构期间的辅助日志备份与备忘录（通常可用于文档存档或定期清除）。
