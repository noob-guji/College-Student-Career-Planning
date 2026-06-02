# 前后端与 SQLite 数据库连接策略设计

Next.js (App Router 模式) 提供了极大的灵活性，不仅支持传统的 API 模式，还原生支持服务端组件（Server Components）以及服务端执行动作任务（Server Actions）。针对 `README-2.md` 中提及的九个核心前端功能，我为您量身定制了前后端连接及数据库读写的落地方案。

---

## 一、 Auth (认证与授权) 功能
**适用组件**: `SlidingAuth.tsx`（登录与注册滑块表单）

① Route Handlers (REST API 模式)
这是最传统也是项目目前明确使用的方法。

实现: 在 `src/app/api/auth/.../route.ts` 目录下编写 route 文件。在接口内调用 `src/server/services/auth.service.ts` 然后使用 `lib/prisma.ts` 中的 Prisma 驱动来查询与插入 SQLite 的 `User` 表。
例子: `src/app/api/auth/register/route.ts` 接入注册数据处理；`src/app/api/auth/[...nextauth]/route.ts` 处理全局 Auth 状态。
连接方式: 前端 Client Component（`SlidingAuth.tsx`）通过浏览器原生 `fetch()` 调用这些 API 接口（如 `/api/auth/register`）并传递经过表单验证的 JSON 注册信息；如果是登录操作，则调用 NextAuth 原生的 `signIn("credentials", ...)`。

---

## 二、 面板核心：AI 大模型对话挂件
**适用组件**: `AIAssistantWidget.tsx` 

① Route Handlers (Streaming API 流式输出模式)
当接入 AI 对话大模型时，传统的卡顿等待响应体验十分糟糕，应该采用服务器推送流。

实现: 在 `src/app/api/chat/route.ts` 创建后端流式接口，其内部连接第三方 LLM 的 API，也可同时使用 Prisma 查询存在 SQLite 中的用户历史聊天记录 (如 `ChatMessage` 表) 作为上下文。
例子: `src/app/api/chat/route.ts` 接收 prompt 并生成 ReadableStream 传给前端。
连接方式: 配合 `useAIAssistant.ts` 自定义 Hook，底层采用 `EventSource` （或特定的三方 SDK，如 Vercel AI SDK 的 `useChat`）流式逐步渲染服务器返回的数据块，以打字机特效展现在 `AIAssistantWidget` 组件里。

---

## 三、 面板核心：智能文本编辑器
**适用组件**: `SmartEditorTool.tsx` 

① Server Actions (RPC 动作调用机制)
富文本编辑器涉及实时内容草稿自动保存，如果每次都建一个专门的 API 路由会增加项目碎片感，Server Actions 是最直接的处理方案。

实现: 在 `src/server/actions/editor.actions.ts` 中编写并带有 `'use server'` 指令的异步函数，利用 Prisma 向 SQLite 的 `EditorDraft` 或 `Document` 数据表进行 CRUD（增删改查）操作。
例子: 定义 `export async function saveDraft(content: string, docId: string)` 。
连接方式: 编辑器组件内部直接 import 该 Action 函数，通过 React 19 的 `useTransition` 或 `useActionState` 直接调用。框架将自动利用底层封装的 POST 隐藏路由和后端进行 HTTP 连接传输编辑器中的文本片段。

---

## 四、 岗位/行业知识域：职场知识图谱
**适用组件**: `JobKnowledgeGraph.tsx` 

① Server Components (无 API 直连模式)
知识图谱常常代表巨大的初始节点数据集渲染（来自 `jobsData.ts` 和数据库）。为了不在加载视图时让巨大的 JSON 传输到客户端，这部分应该在服务器静默拼接好。

实现: 无需添加任何接口文件。直接将该页面/父级布局定义为 Server Component（无需顶部使用 `'use client'`）。在组件内部直接通过 `prisma.jobGraphNode.findMany()` 获取 SQLite 里的图谱数据。
例子: 在 `src/app/(dashboard)/home/page.tsx` 中。
连接方式: 直接在服务端的 Server Component 中通过 Prisma 执行 SQLite 查询，获取图表数组。然后仅将序列化好的纯静态数据（Data Props）传入渲染库组件（`JobKnowledgeGraph` 中引用 `ECharts` 或 `@xyflow` 渲染器）。前端无感应，且省略了首屏 API 瀑布流网络加载耗时。

---

## 五、 人岗匹配：能力侧输入
**适用组件**: `CapabilityInputForm.tsx` (用户录入提交能力等数据)

① Server Actions (表单 RPC 提交模式)
Next.js 最推崇也是最原生的纯表单提交模式。

实现: 在 `src/server/actions/matching.actions.ts` 建立动作逻辑集。定义 `submitCapabilityProfile(formData: FormData)` 并使用 Prisma 更新 SQLite 中的 `UserProfile` 数据表。
例子: 向数据库中 `User.capabilities` JSON 字段写入解析过的标签。
连接方式: 在 `CapabilityInputForm.tsx` 中的 `<form>` 的 `action` 属性上，直接绑定上述 Server Action （甚至能免去手工编写 fetch 等冗杂网络状态防抖函数）。

---

## 六、 人岗匹配：综合画像雷达图面板
**适用组件**: `CapabilityPortraitDashboard.tsx` 

① Server Components (无 API 直连模式)
类似于知识图谱模式，只需要单纯展现分析完成的现成数据面板。

实现: 父页面本身是 Server UI。在进行该页面 SSR 构建时，通过 `prisma.analysisResult.findUnique()` 直接取出用户之前在 SQLite 中打好的雷达维度结果。
例子: `src/app/(dashboard)/person-post-matching/page.tsx`。
连接方式: 把 SQLite 取出来的纯 JSON 配置化变量传入 `CapabilityPortraitDashboard.tsx` 组件让其利用如 `Recharts` 加载图表即可。不需要为了简单的只读界面去构造专门的 `route.ts` 接口。

---

## 七、 人岗匹配：异步生成长篇匹配分析报告
**适用组件**: `BlueprintReport.tsx`

① Route Handlers & Server Actions (两段式生成与状态轮询/长连接)
匹配计算或者生成分析报告可能是一个重度任务（耗时 10-20秒 ），前端需要能有明确进度控制。

实现: 初始化调用：在 `src/server/actions/report.actions.ts` 里声明 `generateBlueprint()` ，将任务插入数据库表 `TaskQueue` 并标记 `pending` 状态返回 ID ；处理队列：后台脚本进行算法调用；进度查询接口：在 `src/app/api/reports/[id]/status/route.ts` 设立获取该报告状态的接口。
例子: `src/app/api/reports/...`
连接方式: 前端 Client Component 首先触发 Action 函数生成一份报告指令存入数据库；随后前端开一个 `setInterval` 每 3 秒自动通过 `fetch()` 查询上述 API 看云端大模型与匹配计算是否全部写回了数据库（轮询直至 `status == 'success'`）。成功后，刷新 UI 展示渲染内容。

---

## 八、 岗位简介展示组件
**适用组件**: `JobProfileCard.tsx` 

① Server Components (静态属性透传)
高度复用的卡片，多存在于列表展示页面。

实现: 卡片作为纯 UI 原子，不需要设计接口。列表父级（大厅页面）如 `src/app/(dashboard)/roles/page.tsx` 使用 Prisma 一次性取出 SQLite `JobPost` 表多条集合。
例子: `const jobs = await prisma.jobPost.findMany();`
连接方式: 完全以 Props (`<JobProfileCard job={jobs[0]} />`) 的形式把读取出的数据强行注入即可，不要在卡片内部去做 API 网络请求。

---

## 九、 自我认知域：MBTI 测试流相关
**适用组件**: `MBTILanding.tsx`、`MBTIModal.tsx`（答题）、`PersonalityDetailsModal.tsx`（结果详情）

① Route Handlers (REST API 模式) 结合 React Context

实现: 在 `src/app/api/mbti/submit/route.ts` 中设定接受用户问卷打分的聚合体。接到数据后执行具体的计分后端算法，算出对应那 16 种性格画像的归属，随即利用 Prisma 将 `MbtiResult` 及时间戳归档写入 SQLite ，随后回传 JSON 结果字符串。
例子: `src/app/api/mbti/submit/route.ts` 处理答题完成时的统筹运算。
连接方式: 前端在答题模态框（`MBTIModal.tsx`）的最后一题确认按钮上绑定 `fetch("/api/mbti/submit", { body: JSON.stringify(answers) })` ；取得返回的人格详细结果对象后派发事件展示 `PersonalityDetailsModal.tsx`。
