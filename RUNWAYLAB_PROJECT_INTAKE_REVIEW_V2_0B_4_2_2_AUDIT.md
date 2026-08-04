# RUNWAYLAB PROJECT INTAKE REVIEW V2.0B.4.2.2 AUDIT

版本：V2.0B.4.2.2 项目资料完善与平台评估

审计范围：当前代码副本 `D:\Documents\New project\runwaylab`。本地 Git 基线未验证；本报告仅基于当前代码副本静态审计，不代表已在正式 Git 基线 `d01820080acd8f1a8d0c587201df89dcf130c738` 上完成验证。

本轮审计只评估方案与风险，不实施业务代码修改。

## 当前结构

当前 V2.0B.4.2.1 已存在最小启动草稿能力：

- `prisma/schema.prisma` 已定义 `ProjectIntakeStatus`，当前只有 `DRAFT` 和 `READY_FOR_REVIEW`。
- `ProjectIntake` 已包含 `ownerId`、`clientDraftId`、`sourceType`、`category`、`categoryOther`、`primaryNeed`、`ideaText`、`status`、`completion`、后续绑定字段、`submittedForReviewAt`、`createdAt`、`updatedAt`。
- migration `prisma/migrations/20260730160000_add_project_intake_start_flow/migration.sql` 已创建 `ProjectIntake`、`ProjectIntakeStatus`、`ownerId + clientDraftId` 幂等唯一约束和基础索引。
- `/start` 已提供四步轻量启动流程，使用 `sessionStorage` 保存未登录草稿，登录后恢复并创建 `ProjectIntake`。
- `/api/start-projects` 使用当前 session 的 `user.id` 创建草稿，不接受客户端 `ownerId`。
- `/api/start-projects/[id]` 提供读取和 PATCH 更新。
- `/me/start-projects/[id]` 是私有草稿详情，已设置 `noindex`。
- `/me/projects` 已聚合当前用户的启动草稿和已有 Work 项目。
- `src/lib/start-projects.ts` 提供标签、标题、下一步、owner/admin 可见性和创建更新逻辑。
- `src/lib/start-projects/validation.ts` 已白名单校验 `sourceType`、`category`、`primaryNeed`，但 PATCH schema 目前允许客户端提交 `status`。
- 现有管理员权限通过 `src/lib/permissions.ts` 的 `isAdmin` 和 `src/lib/auth/guards.ts` 的 `requireAdminUser` 判断。
- 现有通知通过 `src/lib/notifications.ts`，已有安全链接过滤、内容脱敏和短时间去重。
- `AdminLog` 是管理员操作日志，字段为 `adminId`、`action`、`targetType`、`targetId`、`detail`。
- 当前后台首页链接集中在 `src/app/admin/page.tsx`，后台 layout 只做权限保护，不提供统一侧边栏。
- 已有轻量确认组件 `src/components/lifecycle/LifecycleActionButton.tsx`，也有 `src/components/me/MyWorksList.tsx` 的自定义确认弹层；部分旧后台组件仍使用 `window.confirm`。

## 18 个审计问题回答

1. 当前 `ProjectIntake` 哪些字段足以支持平台评估？

   当前字段足以支持“60 秒启动草稿”：owner、幂等草稿号、来源、品类、当前需求、一句话想法、私有状态、后续对象绑定和基础时间戳。它不足以支持平台评估决策，因为缺少项目名称、目标用户、穿着场景、预期价格带、推进时间和评估备注。

2. 哪些信息必须新增？

   建议只新增最小评估字段：`projectTitle`、`targetAudience`、`useScenario`、`expectedPriceBand`、`launchTiming`、`reviewMessage`。管理员处理还需要 `reviewedById`、`reviewedAt`、`reviewNote`，并需要事件模型保存用户可见时间线。

3. `completion` 应继续持久化，还是由字段动态计算？

   推荐服务端动态计算为事实来源。若继续保留数据库 `completion`，它只能作为服务端写入的缓存，客户端禁止提交。所有创建、资料更新、提交、撤回和管理员处理后都应由同一个服务端函数重算。

4. 当前 75% 默认值是否合理？

   不合理。60 秒启动只收集来源、品类、需求和一句话，真实完整度应约 40% 到 50%。当前 `completion` 默认 75 且 `completionFor()` 最多 85，会让用户误以为草稿几乎可评估，和本轮“资料完整度只提示缺什么”的原则冲突。

5. 如何处理 V2.0B.4.2.1 已经产生的启动草稿？

   旧草稿继续可读，不在 migration 中虚构新字段。新字段全部允许 `NULL`，页面根据服务端计算结果引导继续补充。旧 `DRAFT` 保持 `DRAFT`；旧 `READY_FOR_REVIEW` 应按实际字段完整度重新展示为“可补充”或“可以提交评估”，不要在 migration 中批量重写业务含义。

6. 如何避免直接重写现有生产草稿？

   migration 只追加字段、枚举值、事件表和索引，不更新旧行内容，不写默认答案，不迁移成 Work、CollaborationProject 或 IncubationProject。页面层做兼容展示，服务端更新时只修改当前用户正在操作的那一条。

7. `READY_FOR_REVIEW` 与真正“已提交”应如何区分？

   `READY_FOR_REVIEW` 表示资料已经足够，可以提交评估；`SUBMITTED` 表示 owner 已明确提交，等待平台处理。当前实现把 `READY_FOR_REVIEW` 显示成等待评估，并在 PATCH 时设置 `submittedForReviewAt`，语义混在一起，需要拆开。

8. 是否需要扩展 `ProjectIntakeStatus`？

   需要。建议扩展为 `DRAFT`、`READY_FOR_REVIEW`、`SUBMITTED`、`NEEDS_INFO`、`ACCEPTED`、`DECLINED`。不建议本轮加入 `CONVERTED` 或 `ARCHIVED`，避免把启动入口扩展成第二套长期 Project。

9. 是否需要项目评估事件记录？

   需要。用户需要看到提交、撤回、平台要求补充、重新提交、通过和暂不适合的历史。建议新增 `ProjectIntakeEvent` 和 `ProjectIntakeEventType`。

10. 是否能复用 `AdminLog`？

   可以复用 `AdminLog` 记录管理员后台操作审计，但不能只用它承载用户可见评估历史。管理员决策时建议同时写 `ProjectIntakeEvent` 和 `AdminLog`。

11. 为什么 `AdminLog` 不能完全代替用户可见评估历史？

   `AdminLog` 强依赖 `adminId`，面向后台审计，不适合记录用户创建、资料更新、提交、撤回和重新提交。它的 `detail` 是后台日志结构，不是用户可读时间线，也不适合给 owner 直接读取。

12. 如何避免管理员覆盖较新的用户修改？

   管理员详情表单应带 `updatedAt` 或轻量版本号。服务端在事务中使用 `updateMany({ where: { id, status: SUBMITTED, updatedAt: expectedUpdatedAt } })` 或同等乐观锁校验。若 count 为 0，返回“项目资料已更新，请刷新后再处理”。

13. 如何防止重复提交？

   用户提交必须走专用服务端函数。若当前已经是 `SUBMITTED`，直接返回当前详情，不重复写事件、通知或 `submittedForReviewAt`。从 `READY_FOR_REVIEW` 或补充完成的 `NEEDS_INFO` 进入 `SUBMITTED` 时，在事务内更新状态并创建唯一语义事件。

14. 如何保证状态迁移只能按允许路径发生？

   禁止客户端 PATCH `status`。所有状态变更通过集中函数，例如 `submitProjectIntakeReview()`、`withdrawProjectIntakeReview()`、`reviewProjectIntakeAsAdmin()`。函数内部读取当前状态、重新计算完整度、校验 actor、校验允许迁移，再事务写入。

15. 如何在后台列表避免 N+1？

   `/admin/project-intakes` 使用一次 `findMany`，只 select 列表需要字段和 owner 最小信息，例如 `id`、`nickname`、`persona`，不读取 email、phone、passwordHash。事件只在详情页读取。列表分页，`pageSize` 有上限，默认筛选 `SUBMITTED`。

16. 如何保证草稿仍不进入公共作品、榜单、搜索和 metadata？

   不把 `ProjectIntake` 接入 `/works`、`/rankings`、公开 `/projects`、首页内容流、服务商机会池、sitemap 或公开 metadata。`/start` 和 `/me/start-projects/[id]` 继续 `noindex`，详情读取必须 owner/admin 服务端校验。

17. 如何在用户登录状态过期时安全恢复？

   `/start` 继续使用 `sessionStorage` 存储未登录草稿，不把长文本或敏感内容放 URL。API 401 返回安全 `loginUrl`，登录后回到 `/start` 或详情页。详情资料完善页面如果 PATCH 401，应保留本地未保存状态并跳转登录，避免重复创建。

18. 是否需要新增独立 migration？

   需要。因为要扩展状态枚举、给 `ProjectIntake` 增加评估字段和 reviewer 关系，并新增 `ProjectIntakeEvent`。应新增一条独立 migration，例如 `prisma/migrations/20260731xxxxxx_add_project_intake_review_flow/migration.sql`。

## 问题

- 当前 `ProjectIntakeStatus` 只有两种状态，无法表达“资料足够但未提交”和“已提交等待平台处理”的差异。
- 当前 `projectIntakePatchSchema` 允许客户端提交 `status`，这会绕过服务端状态机，是本轮必须修复的权限风险。
- 当前 `completion` 默认 75，且计算只覆盖启动字段，不能代表平台评估资料完整度。
- 当前 `submittedForReviewAt` 在进入 `READY_FOR_REVIEW` 时被设置，时间语义不准确。
- 当前没有用户可见事件记录，平台反馈如果只覆盖一个字段会丢失历史。
- 当前没有后台评估页面，也没有管理员处理的乐观锁和并发冲突提示。
- 当前没有评估结果通知策略，owner 不能稳定知道平台反馈。
- 当前 `/me/start-projects/[id]` 只是说明型详情，不是渐进式资料完善流程。
- 当前旧草稿若被直接套新规则，可能被误判为可提交或等待评估，需要兼容层。

## 推荐数据模型

### ProjectIntake 新增字段

新增字段全部允许 `NULL`，避免破坏旧草稿：

- `projectTitle String?`
- `targetAudience String?`
- `useScenario String?`
- `expectedPriceBand String?`
- `launchTiming String?`
- `reviewMessage String?`
- `reviewNote String?`
- `reviewedAt DateTime?`
- `reviewedById String?`
- `reviewedBy User? @relation(...)`

`projectTitle` 只作为用户可编辑的临时名称，缺省时继续使用 `projectIntakeTitle()` 生成“我的某品类项目”。

`useScenario`、`expectedPriceBand`、`launchTiming` 可以继续用字符串字段加服务端白名单，避免 enum 过多。若项目风格更偏强类型，也可新增 enum，但本轮最小方案建议字符串字段加 Zod 白名单。

### ProjectIntakeStatus 扩展

建议扩展：

- `DRAFT`
- `READY_FOR_REVIEW`
- `SUBMITTED`
- `NEEDS_INFO`
- `ACCEPTED`
- `DECLINED`

### ProjectIntakeEvent

建议新增：

- `id String @id @default(cuid())`
- `intakeId String`
- `actorId String?`
- `eventType ProjectIntakeEventType`
- `note String?`
- `createdAt DateTime @default(now())`
- `intake ProjectIntake @relation(fields: [intakeId], references: [id], onDelete: Cascade)`
- `actor User? @relation(fields: [actorId], references: [id], onDelete: SetNull)`
- `@@index([intakeId, createdAt])`
- `@@index([actorId])`
- `@@index([eventType])`

建议事件类型：

- `CREATED`
- `DETAILS_UPDATED`
- `SUBMITTED`
- `WITHDRAWN`
- `NEEDS_INFO`
- `RESUBMITTED`
- `ACCEPTED`
- `DECLINED`

旧数据不强制回填 `CREATED`。详情页如无事件，可用 `ProjectIntake.createdAt` 显示“项目已启动”。后续第一次触发动作时可按需补一条 `CREATED`，但不能伪造用户历史。

## 状态机

允许迁移：

- `DRAFT` -> `READY_FOR_REVIEW`：服务端计算资料完整。
- `READY_FOR_REVIEW` -> `DRAFT`：资料被改得不完整。
- `READY_FOR_REVIEW` -> `SUBMITTED`：owner 提交平台评估。
- `SUBMITTED` -> `NEEDS_INFO`：管理员要求补充。
- `SUBMITTED` -> `ACCEPTED`：管理员通过评估。
- `SUBMITTED` -> `DECLINED`：管理员判断暂不适合。
- `NEEDS_INFO` -> `READY_FOR_REVIEW`：用户补充后完整但尚未重新提交。
- `NEEDS_INFO` -> `SUBMITTED`：用户补充完整并重新提交。
- `SUBMITTED` -> `DRAFT` 或 `READY_FOR_REVIEW`：用户在管理员处理前撤回，按当前完整度决定。

禁止迁移：

- 客户端直接提交 `status`、`completion`、`reviewedById`、`reviewedAt`。
- 用户把自己设置成 `ACCEPTED`、`DECLINED` 或 `NEEDS_INFO`。
- 管理员从 `DRAFT` 直接设置 `ACCEPTED`。
- `DECLINED` 自动变成 `ACCEPTED`。
- `ACCEPTED` 被普通资料更新接口改状态。
- GET 请求修改任何状态。
- URL 参数触发状态更新。

## 权限矩阵

| 操作 | 未登录 | owner | 其他普通用户 | 服务商 | 管理员 |
| --- | --- | --- | --- | --- | --- |
| 创建本地 `/start` 草稿 | 可以，仅 sessionStorage | 可以 | 可以 | 可以 | 可以 |
| 写入 `ProjectIntake` | 不可以 | 可以，只能绑定自己 | 不可以 | 只能给自己创建普通用户草稿 | 可以创建自己的草稿，但不建议代创建 |
| 读取草稿详情 | 不可以 | 可以 | 不可以 | 不可以读取他人草稿 | 可以 |
| 修改草稿资料 | 不可以 | 可以，限允许状态 | 不可以 | 不能修改他人草稿 | 不建议用普通 PATCH 修改他人资料 |
| 提交评估 | 不可以 | 可以，限完整资料 | 不可以 | 不能提交他人草稿 | 不建议代提交 |
| 撤回评估 | 不可以 | 可以，仅 `SUBMITTED` 且未处理 | 不可以 | 不可以 | 可在后台处理，不走用户撤回 |
| 读取事件 | 不可以 | 可以读取自己事件 | 不可以 | 不可以 | 可以 |
| 后台列表和详情 | 不可以 | 不可以 | 不可以 | 不可以 | 可以 |
| 平台评估决策 | 不可以 | 不可以 | 不可以 | 不可以 | 可以，仅 `SUBMITTED` |

## 页面流程

### 用户端 `/me/start-projects/[id]`

详情首页只展示：

- 项目名称。
- 当前状态。
- 当前完成度。
- 已有信息摘要。
- 唯一下一步。
- 项目时间线。
- 轻量“项目资料”入口。

资料完善建议拆成三个短步骤：

1. “这件产品主要为谁而做？”：`targetAudience`、`useScenario`。
2. “你希望它处在哪个价格和时间范围？”：`expectedPriceBand`、`launchTiming`。
3. “检查项目资料”：展示摘要和可选 `reviewMessage`，完整后出现“提交平台评估”。

`NEEDS_INFO` 顶部显示管理员反馈，主行动是“补充平台需要的资料”。`ACCEPTED` 不自动创建长期项目，主行动是“等待平台安排下一步”或“查看平台建议”。`DECLINED` 保留原资料，提供“开始一个新项目”作为轻量入口。

### 管理员端

新增：

- `/admin/project-intakes`
- `/admin/project-intakes/[id]`

后台列表默认筛选 `SUBMITTED`，按提交时间从早到晚排序，分页展示。列表只显示评估必要摘要，不读取完整事件和大段备注。

后台详情显示项目资料、owner 最小信息、当前状态、完成度、时间线和一个决策区。决策区动作：

- 通过评估：note 可选。
- 需要补充：note 必填 10 到 500 字，必须具体。
- 暂不适合：note 必填 10 到 500 字，需二次确认。

## API 设计

推荐保留现有：

- `GET /api/start-projects`
- `POST /api/start-projects`
- `GET /api/start-projects/[id]`
- `PATCH /api/start-projects/[id]`

推荐新增：

- `POST /api/start-projects/[id]/submit`
- `POST /api/start-projects/[id]/withdraw`
- `GET /api/admin/project-intakes`
- `GET /api/admin/project-intakes/[id]`
- `POST /api/admin/project-intakes/[id]/review`

`PATCH /api/start-projects/[id]` 只允许更新用户资料字段，不允许 `status`、`completion`、`submittedForReviewAt`、`reviewedById`、`reviewedAt`、`reviewNote`。

管理员 review 请求体建议：

- `decision`: `ACCEPTED`、`NEEDS_INFO`、`DECLINED`
- `note`: 可选或必填，按 decision 校验
- `expectedUpdatedAt`: 必填，用于乐观锁

## 事务边界

必须使用事务的动作：

- 用户提交评估：读取最新草稿，计算完整度，更新状态，写事件，必要时写 AdminLog。
- 用户撤回评估：校验 owner 和状态，更新状态，写事件。
- 管理员评估：校验 admin、状态和 `expectedUpdatedAt`，更新状态、`reviewedById`、`reviewedAt`、`reviewNote`，写 `ProjectIntakeEvent`、`AdminLog`、Notification。

Notification 可以同事务写入，以确保详情事实与提醒一致。若复用 `createNotificationSafe()`，需要注意它内部直接使用全局 `prisma`，若要和事务强一致，建议新增可传 tx 的内部函数，或在报告中明确通知失败不影响事实状态。

## 并发控制

- owner 更新资料时，只允许 `DRAFT`、`READY_FOR_REVIEW`、`NEEDS_INFO` 被普通接口更新。
- owner 更新资料后服务端重算 completion 和状态。若已 `SUBMITTED`，除撤回外不允许普通资料 PATCH。
- 提交重复点击：已 `SUBMITTED` 直接返回同一结果，不重复写事件。
- 撤回重复点击：若已撤回，返回当前状态并提示无需重复操作。
- 管理员处理：必须使用 `updatedAt` 乐观锁，两个管理员同时处理时只有一个成功。
- 管理员处理后 owner 不能再撤回。
- `ACCEPTED` 和 `DECLINED` 不被普通 PATCH 改回草稿。

## 通知策略

复用现有 `Notification`：

- `NEEDS_INFO`：标题“项目需要补充资料”，链接 `/me/start-projects/[id]`。
- `ACCEPTED`：标题“项目已通过平台评估”，链接 `/me/start-projects/[id]`。
- `DECLINED`：标题“项目评估已有结果”，链接 `/me/start-projects/[id]`。

建议暂不新增 `NotificationType` enum，优先复用 `REQUEST_HANDLED` 存储类型，或在 `NOTIFICATION_EVENTS` 中新增虚拟事件映射到 `REQUEST_HANDLED`。这可以降低 migration 范围。通知正文只放简短提示，不包含完整 `ideaText`、完整 `reviewMessage` 或管理员私人信息。

通知只是提醒，项目详情和 `ProjectIntakeEvent` 是事实来源。

## 数据兼容策略

- 新增字段全部可空。
- 不在 migration 中写假的 `targetAudience`、价格或时间。
- 旧 `DRAFT` 保持 `DRAFT`。
- 旧 `READY_FOR_REVIEW` 不批量重写；服务端读取时按新完整度计算展示。若资料不足，引导补充；若资料完整，展示“可以提交评估”。
- 旧 `completion` 不作为事实来源。页面展示前应调用统一计算函数或由服务端返回新 completion。
- 旧草稿无事件时，详情页用 `createdAt` 兜底展示启动时间。
- 不自动转换到 Work、CollaborationProject 或 IncubationProject。

## Migration 范围

需要新增独立 migration，建议名称：

`prisma/migrations/20260731xxxxxx_add_project_intake_review_flow/migration.sql`

允许包含：

- `ALTER TYPE "ProjectIntakeStatus" ADD VALUE ...` 增加 `SUBMITTED`、`NEEDS_INFO`、`ACCEPTED`、`DECLINED`。
- `ALTER TABLE "ProjectIntake" ADD COLUMN ...` 增加最小评估字段和 reviewer 字段，全部可空。
- 新增 `ProjectIntakeEventType` enum。
- 新增 `ProjectIntakeEvent` 表。
- 新增 reviewer 和 event 外键。
- 新增必要索引，例如 `ProjectIntake_status_submittedForReviewAt_idx`、`ProjectIntakeEvent_intakeId_createdAt_idx`。

禁止包含：

- 删除表或字段。
- 重命名现有模型。
- 修改 Work、IncubationProject、CollaborationProject 核心含义。
- 清空或重写旧 `ProjectIntake`。
- 自动把草稿迁移到公开对象。

## 文件清单

预计后续实施需要新增或修改：

- `prisma/schema.prisma`
- `prisma/migrations/<timestamp>_add_project_intake_review_flow/migration.sql`
- `src/lib/start-projects.ts`
- `src/lib/start-projects/validation.ts`
- `src/app/api/start-projects/[id]/route.ts`
- `src/app/api/start-projects/[id]/submit/route.ts`
- `src/app/api/start-projects/[id]/withdraw/route.ts`
- `src/app/api/admin/project-intakes/route.ts`
- `src/app/api/admin/project-intakes/[id]/route.ts`
- `src/app/api/admin/project-intakes/[id]/review/route.ts`
- `src/app/me/start-projects/[id]/page.tsx`
- `src/components/start/ProjectIntakeDetailsFlow.tsx`
- `src/app/me/projects/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/project-intakes/page.tsx`
- `src/app/admin/project-intakes/[id]/page.tsx`
- `src/components/admin/ProjectIntakeReviewPanel.tsx`
- `src/components/admin/ProjectIntakeDecisionDialog.tsx` 或复用 `LifecycleActionButton`
- `src/lib/notifications.ts`，如需新增虚拟事件映射
- 本轮新增测试脚本
- `RUNWAYLAB_PROJECT_INTAKE_REVIEW_V2_0B_4_2_2_REPORT.md`，实施后生成

## 测试计划

新增测试：

- `scripts/project-intake-details-tests.ts`
- `scripts/project-intake-completeness-tests.ts`
- `scripts/project-intake-submit-tests.ts`
- `scripts/project-intake-withdraw-tests.ts`
- `scripts/project-intake-review-permission-tests.ts`
- `scripts/project-intake-review-transition-tests.ts`
- `scripts/project-intake-review-event-tests.ts`
- `scripts/project-intake-review-notification-tests.ts`
- `scripts/project-intake-review-ui-tests.ts`
- `scripts/project-intake-review-migration-tests.ts`

重点覆盖：

- 新字段长度和白名单。
- `projectTitle` 安全验证。
- 客户端不能提交 `completion`、`status`、`reviewedById`、`reviewedAt`。
- 服务端完整度计算。
- 旧草稿安全显示。
- `UNSURE` 和“还在探索”视为有效回答。
- owner 提交、撤回和幂等。
- 非 owner、服务商、未登录用户不能读取或操作他人草稿。
- admin 只能处理 `SUBMITTED`。
- `NEEDS_INFO` 和 `DECLINED` 必须有具体说明。
- 并发处理只有一个成功。
- 事件创建和可见性。
- Notification 链接安全、去重、无敏感内容。
- 用户端每页一个主按钮，不使用 `alert` 或浏览器 `confirm`。
- 管理员端默认筛选等待评估，暂不适合需要确认。
- migration 只新增结构，不重写旧数据。
- PostgreSQL 16 空库可重放全部 migration。

回归测试：

- 继续执行 V2.0B.4.2.1 的 7 项 start-project 测试。
- 继续执行用户指定的 33 项现有回归测试。
- 执行 `npx prisma format`、`npx prisma validate`、`npx prisma generate`、`npx tsc --noEmit`、`npm run build`。

## 不做事项

本轮不做：

- 自动转换为 Work。
- 自动转换为 CollaborationProject。
- 自动转换为 IncubationProject。
- 自动匹配设计师、面料、供应商。
- AI 项目评分或自动评估。
- 项目成员、聊天、合同、支付、预售、订单。
- 草稿图片上传。
- 学校审核。
- 服务商查看项目。
- 公开创业项目广场。
- 批量评估。
- 导出用户创意。
- Demand V2.1、Marketplace V2.2、Preorder V2.3。

## 审计结论

V2.0B.4.2.1 的 `ProjectIntake` 当前适合作为私有启动入口，但尚不适合作为平台评估闭环。V2.0B.4.2.2 可以在不创建第二套长期 Project 的前提下继续推进，但必须新增独立 migration，扩展 `ProjectIntake` 的最小评估字段、状态机和用户可见事件模型。

实施时最重要的三条边界是：

- `completion` 和 `status` 必须由服务端统一计算和迁移，客户端不能提交。
- `READY_FOR_REVIEW` 必须和 `SUBMITTED` 拆开，避免“可提交”和“已提交”混在一起。
- `AdminLog` 只能作为后台审计，不能替代 `ProjectIntakeEvent` 这种用户可见评估历史。
