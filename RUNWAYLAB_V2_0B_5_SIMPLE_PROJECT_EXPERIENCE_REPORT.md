# RunwayLab V2.0B.5 Simple Project Experience Report

## 改了什么

- 用户提交完整启动资料后，不再停在“等待平台评估”。
- `/api/start-projects/[id]/submit` 现在会在同一个事务中自动创建 PRIVATE `CollaborationProject`，写入 intake 与 project 的 linkage，并生成第一步。
- 新增确定性 first action 规则：
  - `DESIGN` 来源：`确认开发目标`
  - 其他来源：`完善产品需求`
- `/me/projects` 改为“我的项目”统一列表，只展示项目名、品类与当前目标、四阶段进度、当前状态和一个“继续”按钮。
- `/me/projects/collaboration/[id]` 改为轻量项目页：顶部项目名与阶段进度，中间只突出“现在”，下方保留轻量历史记录。
- 普通用户页面去掉“正式项目”“启动草稿”“等待平台评估”“当前行动”“责任方”等内部表达。

## 为什么这样改

V2.0B.5 的目标不是增加业务能力，而是隐藏系统复杂度。底层仍复用 `ProjectIntake`、`CollaborationProject`、`CollaborationProjectAction`、`CollaborationProjectEvent` 和 `Notification`，但普通用户不需要理解 intake、conversion、action responsibility 或人工审核流程。

## 用户体验 Before / After

Before：
- 用户补完资料后提交平台评估。
- 管理员需要手动通过评估、手动建立正式项目、手动安排第一步。
- `/me/projects` 同时展示启动草稿、正式项目、数量统计和多种内部状态。

After：
- 用户补完资料后点击“启动项目”。
- 系统自动建立私有项目并生成第一步。
- 用户直接进入项目页，看到“现在要做：完善产品需求”。
- `/me/projects` 只回答：我的项目是什么、现在进展到哪里、下一步点哪里。

## 自动项目创建机制

`submitProjectIntakeReview(id, user)` 在事务中完成：

- 校验当前用户是 owner。
- 校验资料完整度为 100。
- 若 intake 已 linked 到 project，直接返回已有 project，保持幂等。
- 创建 PRIVATE + DRAFT `CollaborationProject`。
- 将 intake 内部状态推进到 `ACCEPTED`，写入 `linkedCollaborationProjectId`、`convertedAt`、`convertedById`。
- 写入 `SUBMITTED` / `RESUBMITTED`、`ACCEPTED`、`CONVERTED` intake events。
- 写入 `PROJECT_CREATED` project event。
- 创建第一步 action。

## 自动 First Action 机制

新增 `initialActionForProjectIntake`，使用明确规则，不引入 AI：

- 设计作品来源：`确认开发目标`
- 产品想法或其他来源：`完善产品需求`
- 类型保持 `DESIGN_CLARIFICATION`
- 责任保持内部 `USER`

第一步创建通过 `createInitialPrivateProjectActionForIntake` 完成，继续复用现有未结束 action 检查、`ACTION_CREATED` event 和 notification 去重逻辑。

## 用户状态文案

- USER + ACTIVE：`现在要做`
- WAITING_PLATFORM_CONFIRMATION：`已收到`
- PLATFORM + ACTIVE：`我们正在处理`
- 无 unfinished action：`正在准备下一步`

普通用户页面主按钮统一为 `继续`。

## Admin Queue 行为

后台能力保留：

- `/admin/projects` 继续按现有队列规则处理真正需要平台行动的项目。
- USER + ACTIVE 不进入默认高优先级待办。
- PLATFORM + ACTIVE、WAITING_PLATFORM_CONFIRMATION、无 current action 且需要安排下一步的项目仍可进入后台处理队列。
- 管理员详情页仍保留 action 控制、事件历史、cancel/complete/manual correction。

## Tests

已执行：

- `scripts/*-tests.ts`：Passed scripts: 75
- `scripts/simple-project-experience-tests.ts`
- private project/action tests
- project intake conversion/review/submit tests
- `npx tsc --noEmit`
- `npx prisma generate`

`npx prisma validate` 需要 `DATABASE_URL` 环境变量；本轮使用隔离占位连接串重跑，不连接生产数据库。

## Known Limitations

- 本轮不新增数据库 stage enum，阶段仅为 UI helper 映射。
- 本轮不启用 Demand、Marketplace、Preorder、Payment、Order、Chat、供应商匹配或 AI agent。
- 自动 first action 使用确定性规则，尚不根据复杂图片/供应链信息生成个性化任务。
- 管理员旧的 review/convert 能力保留，用于后台兼容和人工纠偏，不作为普通用户默认流程。

## Real E2E Supplement

V2.0B.5 real browser E2E has been updated to the new automatic project launch flow:

- owner creates a ProjectIntake from `/start`
- submitting complete details immediately creates one PRIVATE `CollaborationProject`
- the intake is linked to that project without admin review
- the first unfinished action is deterministic: `DESIGN_CLARIFICATION` + `USER`
- repeated submit and concurrent launch requests are asserted as idempotent
- owner pages assert human-facing copy instead of internal enum labels
- outsider access keeps the existing private 403/404 semantics
- responsive smoke covers 375x812, 390x844, 430x932, and 1440x900

Local Windows verification completed for static suites, TypeScript, production build, and Playwright test discovery. Full PostgreSQL 16 Docker + Chromium execution still requires the Codespaces isolated environment.

## E2E Contract Audit Update

Codespaces real E2E exposed a test-data issue in the concurrent launch case: the generated `projectTitle` included a full timestamp and exceeded the real 50 character API contract. This was a test payload bug, not a production validation bug.

The E2E now uses short helpers for dynamic project/action titles and preflights request bodies before browser `fetch` calls:

- `projectTitle` stays at or below the E2E safety limit of 40, below the real 50 character route contract
- action `title` stays at or below the E2E safety limit of 30, below the real 40 character route contract
- `ideaText`, `targetAudience`, `reviewMessage`, `instructions`, `completionNote`, and `reason` are checked against the route contracts before requests are sent
- enum payloads used by `/api/start-projects`, `/api/start-projects/[id]`, and admin/user action routes are preflighted

No production API validation was loosened.
