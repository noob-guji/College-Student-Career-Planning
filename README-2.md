# 项目文件与结构详细说明文档

本文档对基于 Next.js 与 FSD 架构设计的该系统项目文件进行了详细的剖析，包含 `src` 业务核心目录深度解析、`prisma` 数据库核心解析、以及根目录下配置文件的功能与删减分析。

---

## 1. 📁 `src/` 核心业务逻辑层文件详解

本项目采用了 FSD (Feature-Sliced Design) 架构，以达到高内聚、低耦合的特性。`src/` 包含了系统的主流代码逻辑。

### 🌐 UI 与路由表现层 (`src/app/` 或 `app/`)
*由于 Next.js 13+ App Router 的特性，视图页面的组装大多在此完成。*
* **`app/layout.tsx`**: 根布局。包含全站 HTML 骨架，并加载全局 Context Provider（如主题、鉴权等）。
* **`app/page.tsx`**: 应用的主要入口着陆页（Dashboard或向导页的重定向枢纽）。
* **`app/globals.css`**: 安装 TailwindCSS 的原生全局 CSS 样式入口。
* **`app/(auth)/auth/page.tsx`**: 授权相关（登录、注册等）统一的路由拦截展示页。
* **`app/(dashboard)/layout.tsx`**: 面板区公用布局规范结构，注入了 Header 与侧边栏 Sidebar。
* **`app/(dashboard)/*/page.tsx`**: 内部各功能模块视图级入口文件（包含 `home` 首页、`person-post-matching` 人岗匹配、`roles` 角色信息、`self-cognition` 自我认知等页面路由解析）。
* **`app/api/auth/[...nextauth]/route.ts`**: Auth.js(NextAuth) 原生动态路由，处理 OAuth/Session/签发凭证等后端网络请求中枢。
* **`app/api/auth/register/route.ts`**: 用于拦截注册的内部 API，对参数进行反序列化与安全性判断后将业务调度给 Server API。

### 🧩 标准化组件库 (`src/components/`)
存放跨不同业务能够全局复用的布局与基础组件，不包含深层业务逻辑。
* **`components/layout/Header.tsx`**: 跨页面的全局顶部主导航栏组件。
* **`components/layout/Sidebar.tsx`**: 多页面复用的全局侧边导航抽屉面板组件。

### 💾 静态资源域 (`src/data/`)
* **`data/jobsData.ts`**: 封装了复杂节点图谱、岗位默认信息数组的硬编码或静态变量，用于驱动 `JobKnowledgeGraph` 的图表渲染。

### 🚀 业务切片核心层 (`src/features/`)
将高耦合的业务逻辑按实体进行垂直拆分：
* **`auth/components/SlidingAuth.tsx`**: 登录/注册模块里带有滑动交互的逻辑窗体组件，内部管理注册时的验证码或状态。
* **`auth/components/AuthProvider.tsx`**: NextAuth `SessionProvider` 的二次封装容器，包裹根程序用。
* **`dashboard-core/components/AIAssistantWidget.tsx`**: 面板核心模块中承载大模型对话挂件气泡组件。
* **`dashboard-core/components/SmartEditorTool.tsx`**: 系统内置的智能富文本或者业务内容编辑器引擎。
* **`jobs/components/JobKnowledgeGraph.tsx`**: 高维图表分析模块组件，接收数据并绘制职场能力结构网络知识图谱。
* **`matching-center/components/CapabilityInputForm.tsx`**: 人岗匹配系统里的用户侧输入源，负责能力的提交表单验证。
* **`matching-center/components/CapabilityPortraitDashboard.tsx`**: 渲染用户的综合能力画像与雷达图展板。
* **`matching-center/components/BlueprintReport.tsx`**: 人岗匹配计算结束后展示出的超长综合报告和分析的 UI。
* **`matching-center/components/JobProfileCard.tsx`**: 列表或详情页抽象的特定岗位简介卡片级组件。
* **`self-cognition/components/MBTILanding.tsx`**: 引导用户进行性格测评的欢迎和概览页组件。
* **`self-cognition/components/MBTIModal.tsx`**: MBTI 测试进程弹出的专用答题或解析悬浮模态框。
* **`self-cognition/components/PersonalityDetailsModal.tsx`**: 根据用户具体性格维度的详细解析模态框扩展视窗。

### 🔌 共享逻辑钩子 (`src/hooks/`)
* **`hooks/useAIAssistant.ts`**: 抽离组件中关于连接、通信、获取大模型上下文回答历史的核心自定义方法。

### 🧱 核心单例驱动 (`src/lib/`)
* **`lib/prisma.ts`**: 系统的 Prisma 连接客户端的单例对象创建。防范开发环境频繁热重载时产生的多个数据库连接句柄导致的崩溃。

### ⚙️ 后端纯业务服务层 (`src/server/`)
* **`server/services/auth.service.ts`**: 脱离 HTTP API 解析控制的底层服务。负责用户对象的持久化创建与读取：比如比对邮箱是否已被注册、密码加盐加密存储进库的实现。

### 🔁 `src/proxy.ts`
* 一份代理中间件配置脚本，用来指定运行环境中针对某些特殊路径的拦截匹配、反向请求代理（用作跨域问题的解决）。

---

## 2. 📁 `prisma/` 功能与作用分析

这个文件夹是 **Prisma ORM（对象关系映射系统）** 的配置与工作核心目录，直接决定了该系统业务逻辑层面与底层数据库层的对接：
* **核心功能**：充当代码与关系型数据库沟通的编译器翻译层、模型定义层兼自动生成数据客户端。利用 TypeScript 类型系统的健壮特性提供精确类型推导。
* **`prisma/schema.prisma`**：**至关重要的建表与核心设计文件**。里面采用 Prisma 模型专用语法精确定义了数据表的结构（各种 Data Models, 例如 Users, Posts, Sessions 等）、定义主键自增方式和生成 Prisma Client 适配器代码的规则。
* **`prisma/dev.db`**：根据 `schema.prisma` 建好或迁移（Migrated）后产生的 **SQLite 实体数据库文件**。其保存了本地测试环境里注册的账号及运行所产出的全部真实开发内测数据。

---

## 3. 📄 根目录下文件的详细作用与影响（删除风险分析）

在项目的根目录下包含许多控制配置文件以及开发衍生的临时文件，下面对其进行逐一分析并在后面标注其对项目的影响及是否可删除的操作建议。

### 一、 绝对不可删除的核心程序配置文件
1. **`.env`**
   - **作用**：环境变量挂载点，目前包含系统的 `DATABASE_URL` 与用来配置 NextAuth 哈希算法的绝对安全机密 `AUTH_SECRET`。
   - **操作影响**：**绝对不可删除**。若删除该文件，系统将彻底丢失与数据库的通讯能力，无法校验现有任何账号；登录及系统功能将发生崩溃宕机。
2. **`package.json`** 与 **`package-lock.json`**
   - **作用**：应用构建的心脏和包管理总览。`package.json` 指示了项目运行脚本以并指定了 React 19、Next 16 等极度具体的依赖表。`package-lock.json` 则锁定在网络拉取时的依赖次级精准版本树。
   - **操作影响**：**`package.json` 绝对不能删**，否则整个项目将不可运行。`package-lock.json` 虽然强力推荐保留（防止因小版本升级产生的血案），但确因包冲突不可解时可以将其删除然后使用 `npm install` 自动重建。
3. **`tsconfig.json`**
   - **作用**：TypeScript 编译指导规则文件，指定了别名映射（`@/*`）、严格模式类型以及目标构建环境。
   - **操作影响**：**绝对不可删除**，删除会导致 Next.js 丧失对 Typescript 源码处理的指针报错进而无法完成构建启动。
4. **`next.config.ts`**
   - **作用**：Next.js 后端服务级路由拦截转录器与主框架核心配置引擎，此项目特别用它透传了如 `bcryptjs` 等对服务外侧包装强制执行的环境设定。
   - **操作影响**：**绝对不可删除**，是控制构建行为和生产配置的核心源头。
5. **`postcss.config.mjs`**
   - **作用**：PostCSS 插件运行器规范引擎，目前此项目利用该引擎接入了 TailwindCSS 最新版本的核心语法糖去解析页面内的样式类。
   - **操作影响**：**绝不能删除**，若缺失会导致 Next 停止注入和解析 Tailwind 特性，造成 UI 页面表现全线坍塌（无 CSS 样式应用）。
6. **`eslint.config.mjs`**
   - **作用**：系统内统一代码格式风格校验器逻辑载体配置。
   - **操作影响**：**推荐保留**，删除虽在执行阶段不影响线上效果，但这会导致丢失语法前置报错护栏从而失去团队开发的规范化工具约束。

### 二、 可以删除的开发与记录性残留资料
1. **`fix-imports.js`**
   - **作用**：用于修改文件内部使用旧版或相对导出的错误地址（例如由于重构引入文件导致引脚错乱），以此脚本批量改回 `@/` 前置路径别名的 Node.js 工具钩子。
   - **操作影响**：**可以删除**（确认文件路径修正完成已经全量稳定运行之后完全废弃）。
2. **`PROJECT_STRUCTURE.md`** 和 **`README.md`**
   - **作用**：两者均是给人阅读使用的信息流转文档档，分别介绍了详尽的早期架构解构意图以及 `create-next-app` 初始化自动产生的一些指南文档。
   - **操作影响**：**可以删除或合并修改**，完全属于可读文本范畴。
3. **各种构建残留与命令行输出志（全部 `build*.txt` 及 `tsc_*.log` 文件）**
   - **包含**：`build_log.txt`, `build_log2.txt`, `build_output.txt`, `build_output_clean.txt`, `build_output_clean2.txt`, `build_output_clean2_utf8.txt`, `build_output_clean_utf8.txt`, `build_output_utf8.txt`, `tsc_errors.log` 及 `tsc_errors_utf8.log`。
   - **作用**：这类全是因为开发者在开发运行或打包生产时，在控制台出现严重错报堆栈而手动导出保留做备份参考用的日志堆填数据。
   - **操作影响**：**完全可以且建议删除**，它们对源码程序毫不相干无任何实际工作用处，并且占用环境目录整洁度。
4. **各种结构与图形暂存测试文本记录（`*.txt` 及根项目分析树）**
   - **包含**：`roles_ascii.txt`, `selfcog_ascii.txt`, `project_tree.txt`, `project_tree_clean.txt`, `project_tree_utf8.txt`
   - **作用**：之前某次需求进行全盘目录树扫描或是为了导出某种字符界面的文本表现体所手动存留的备用实验资产。
   - **操作影响**：**完全可以且建议删除**，只具有当时的记录参考功能不会对代码编译生成影响。

### 三、 根据特定表现自动生成的运行时缓存（系统级管理文件）
1. **`.next/` 目录** 与 **`tsconfig.tsbuildinfo`**
   - **作用**：它们分别是 Next.js 开发构建产生的预缓存核心依赖块集合引擎记录以及 TypeScript 语法热扫描后的局部状态加速储存碎片。
   - **操作影响**：**可以删除，但会自动再生**。在开发构建过程存在“幽灵锁”Bug 时，经常必须手动删去他们再跑起 `dev` 以获得干净运行环境，系统下次运行时会自主全量补偿重新加载创建回来，无需主动管理。
2. **`next-env.d.ts`**
   - **作用**：将 Next 内置的隐式 TypeScript 类型暴露接驳到当前项目。
   - **操作影响**：**可抛弃，每次启动自带**，一般交由框架自动覆写不用关注更不用手动碰。
3. **`.gitignore`**
   - **作用**：设定本地上传 Github 仓库的屏蔽黑库，阻止隐私被外泄。
   - **操作影响**：**绝不建议干涉与删除**，作为 Git 版本仓库标准准则之一存在。
4. **根目录下的 `dev.db`**
   - **注意**：通常这种开发环境数据库都集中保存在 `prisma/` 目录之下。如果是因为旧版配置错误或失误跑到了项目根下建立备份分支，其去留主要看工程目前 `.env` 中 `DATABASE_URL` 指定读取的是哪里的 `.db`。当前设定为 `file:./dev.db`，若它是主力开发库则需**保留**与同步否则会引起 Prisma 指针读取错乱，若是系统废弃残留则可以直接**清除**。
