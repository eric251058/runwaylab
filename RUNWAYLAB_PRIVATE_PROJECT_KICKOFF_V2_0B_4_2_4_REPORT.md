# RunwayLab V2.0B.4.2.4 私人正式项目启动清单与人工阶段推进实施报告

## 基线说明

- 当前代码副本路径：`D:\Documents\New project\runwaylab`
- 当前目录不是 Git 仓库，本地 Git 基线未验证。
- 本轮未执行 commit、push、deploy。
- 本轮未连接生产数据库，未执行生产 migration。
- 本地代码副本中存在 V2.0B.4.2.3 相关报告与功能文件，且 V2.0B.4.2.3 回归测试继续通过。

## 产品决策

- 正式项目继续使用 `CollaborationProject`，本轮没有新增第二套长期 Project。
- 新增 `CollaborationProjectAction` 表示私人正式项目的当前推进动作。
- 新增 `CollaborationProjectEvent` 表示用户可见的正式项目事件时间线。
- 未新增持久化 `stage` 字段；阶段由当前未完成动作的 `type` 推导。
- `CollaborationProject.status` 继续保持 `DRAFT`，`visibility` 继续保持 `PRIVATE`。
- Marketplace、Preorder、Demand、支付、订单、私信、供应商访问私人项目能力均未开启。

## 新增 Prisma

- `CollaborationProjectActionType`
- `CollaborationProjectActionResponsibility`
- `CollaborationProjectActionStatus`
- `CollaborationProjectEventType`
- `CollaborationProjectAction`
- `CollaborationProjectEvent`

## Migration

- `prisma/migrations/20260805193000_add_private_project_kickoff_flow/migration.sql`

Migration 包含：

- 四个 enum。
- `CollaborationProjectAction`。
- `CollaborationProjectEvent`。
- 外键删除策略：Project cascade，User SetNull，Action SetNull。
- 部分唯一索引：
  `CollaborationProjectAction_one_open_action_key`
  用于保证同一个项目最多只有一个 `ACTIVE` 或 `WAITING_PLATFORM_CONFIRMATION` 动作。

## 服务端流程

- `src/lib/private-project-actions.ts` 集中实现动作状态机。
- 管理员创建动作：只允许现有 ADMIN/ACTIVE 用户操作。
- 用户提交结果：只允许项目 owner 操作，且只允许 USER/ACTIVE 动作进入 `WAITING_PLATFORM_CONFIRMATION`。
- 管理员确认完成：只允许处理 `WAITING_PLATFORM_CONFIRMATION` 的用户动作或 `ACTIVE` 的平台动作。
- 管理员取消动作：只允许取消当前未完成动作。
- 所有状态迁移使用事务。
- 并发控制使用 `updatedAt` 条件更新、Serializable transaction、P2002/P2034 捕获和部分唯一索引兜底。
- 重复创建相同当前动作返回幂等成功，不重复制造动作。
- 事件写入使用短窗口去重，避免重复点击产生重复事件。

## 页面和 API

新增 API：

- `POST /api/admin/projects/[id]/actions`
- `POST /api/admin/projects/[id]/actions/[actionId]/complete`
- `POST /api/admin/projects/[id]/actions/[actionId]/cancel`
- `POST /api/me/projects/collaboration/[id]/actions/[actionId]/submit`

新增/增强页面：

- `/admin/projects`：增加私人正式项目待处理队列。
- `/admin/projects/[id]`：新增私人正式项目详情与动作管理。
- `/me/projects`：显示当前阶段、当前动作和唯一下一步摘要。
- `/me/projects/collaboration/[id]`：新增当前动作卡片，用户可提交完成结果。

## 权限和隐私

- ownerId、createdById、completedById、cancelledById 均来自服务端 session。
- 客户端不能提交 owner、actor 或 status 覆盖字段。
- 私人项目读取仍限 owner 和现有管理员权限。
- 私人项目继续 `noindex`，不进入公开作品流、排行榜、搜索、公开项目池或公开 metadata。
- 服务商本轮不能查看私人项目。
- 通知内容走 `safeNotificationSummary` 和安全 URL 处理，不写入密钥、完整 prompt、数据库连接或 session secret。

## UI

- 用户端只显示一个当前下一步。
- 管理端只围绕当前唯一动作创建、确认和取消。
- 没有看板、甘特图、任务树、多人协作或自动供应商匹配。
- 移动端表单使用单列、较大输入框和明确按钮。

## 测试

新增 11 项测试：

- `scripts/private-project-kickoff-eligibility-tests.ts`
- `scripts/private-project-next-action-tests.ts`
- `scripts/private-project-action-permission-tests.ts`
- `scripts/private-project-action-idempotency-tests.ts`
- `scripts/private-project-action-concurrency-tests.ts`
- `scripts/private-project-user-result-tests.ts`
- `scripts/private-project-action-event-tests.ts`
- `scripts/private-project-action-notification-tests.ts`
- `scripts/private-project-workbench-tests.ts`
- `scripts/private-project-public-isolation-tests.ts`
- `scripts/private-project-action-migration-tests.ts`

结果：

- 本轮 11 项测试通过。
- 全量 71 项测试通过，其中包含原有 60 项回归测试。

## 验证

- `npx.cmd prisma format`：通过。
- `npx.cmd prisma validate`：使用临时占位连接配置执行，通过；未写入 `.env` 或真实数据库地址。
- `npx.cmd prisma generate`：通过。
- `npx.cmd tsc --noEmit --pretty false`：通过。
- `npm.cmd run build`：通过。
- PostgreSQL 16 空库重放全部 migration：未执行。本机未安装 `psql`、`pg_isready` 或 Docker，无法启动或连接 PostgreSQL 16 空库。
- `git diff --check`：未执行成功。当前目录不是 Git 仓库。

## 已知限制

- 本轮不自动把 ACCEPTED 项目转换成公开作品、公开合作项目、预售活动或供应商机会。
- 本轮不开放私人项目图片上传。
- 本轮不开放服务商查看私人项目。
- PostgreSQL 16 空库 migration replay 需要在正式 Codespaces 或具备 PostgreSQL 16 的环境中补跑。
