# RunwayLab V2.0B.4.2.4 Audit

版本主题：私人正式项目启动清单与人工阶段推进

当前本地代码副本路径：`D:\Documents\New project\runwaylab`

本地 Git 基线：未验证。当前目录不是正式 Git 仓库。

本阶段只做审计。本报告生成过程中未修改业务代码，未修改 Prisma schema，未新增 migration，未执行测试，未执行构建，未 commit，未 push，未部署，未连接生产数据库。

## 1. 当前私人正式项目结构

当前 V2.0B.4.2.3 已具备 ProjectIntake 到 CollaborationProject 的受控转化能力。

已确认结构：

- `ProjectIntake.linkedCollaborationProjectId` 是唯一关联。
- `ProjectIntake.convertedAt` 记录转化时间。
- `ProjectIntake.convertedById` 记录转化管理员。
- `ProjectIntakeEventType.CONVERTED` 已存在。
- `CollaborationProject.workId` 当前可为空。
- 转化后的正式项目使用 `CollaborationProject`，初始 `status = DRAFT`，初始 `visibility = PRIVATE`。
- `/me/projects/collaboration/[id]` 是私人正式项目详情入口。
- `/me/projects` 会在转化后显示正式项目，并通过 `getProjectIntakesForUser` 排除已转化 intake，避免重复。
- `publicProjectWhere()` 已要求 `visibility = PUBLIC`。

当前私人正式项目仍是静态展示型工作台，尚未具备可推进的“唯一当前动作”数据结构。

## 2. 当前工作台能力

用户侧：

- `/me/projects` 展示三类内容：作品型项目、未转化启动草稿、已转化私人正式项目。
- `/me/projects/collaboration/[id]` 展示私人正式项目摘要、原始启动资料入口、时间线、下一步提示。
- `privateProjectNextAction()` 当前返回固定文案：`等待平台安排下一阶段`。
- 用户不能提交当前动作结果。
- 用户不能看到真正的行动状态机。

管理侧：

- `/admin/project-intakes/[id]` 已有转化入口。
- `/admin/projects` 可查看和编辑 `CollaborationProject` 的基础字段。
- 目前没有独立 `/admin/projects/[id]` 或 `/admin/projects/collaboration/[id]` 的正式项目推进详情页。
- 目前没有管理员设置“唯一下一步”的专门入口。

结论：当前工作台可以安全展示私人正式项目，但还不能承载 V2.0B.4.2.4 所需的人工阶段推进。

## 3. 当前 status / stage / next action 真实含义

`CollaborationProjectStatus` 当前枚举：

- `DRAFT`
- `SEEKING_OWNER`
- `PLANNING`
- `SEEKING_PROPOSALS`
- `SAMPLE_PREPARATION`
- `SAMPLE_REVIEW`
- `PREORDER_READY`
- `PREORDER_OPEN`
- `PRODUCTION`
- `QUALITY_CHECK`
- `SHIPPING`
- `PAUSED`
- `MATCHING`
- `SAMPLING`
- `PRESALE_VALIDATING`
- `PRODUCTION_DISCUSSION`
- `COMPLETED`
- `CANCELLED`

`DRAFT` 在当前私人正式项目语境中表示：正式项目已经建立，但尚未进入公开项目、供应商匹配、预售或生产流程。

当前不存在专门用于私人正式项目推进的持久化 `stage` 字段。

当前存在两类“阶段”概念：

- `project-workbench.ts` 面向作品型项目动态计算的 `ProjectWorkbenchStage`，基于 Work、Incubation、ProviderProposal、CooperationRequest 等对象推导。
- `ProjectMilestone.stage` 的自由文本字段，属于 milestone，不是当前唯一下一步。

当前不存在持久化 `nextAction` 模型。

当前存在：

- 作品型 `buildNextAction()`：从作品相关对象动态推导。
- 私人正式项目 `privateProjectNextAction()`：固定静态文案。
- `CollaborationProject.responsibilityText`：自由文本，不足以表达唯一动作、责任方、状态、完成历史和并发规则。

结论：`status` 表示项目生命周期，`stage` 尚未形成私人正式项目执行阶段，`nextAction` 当前只是显示文案，不是事实来源。

## 4. 可复用模型

可复用：

- `CollaborationProject`：继续作为正式项目主表。
- `Notification`：可复用为用户提醒，但不能作为事实来源。
- `AdminLog`：可复用为后台审计，但不能作为用户时间线。
- `ProjectIntake`：可作为原始启动资料来源，不应继续承载正式项目执行。
- `ProjectIntakeEvent`：只适合启动和评估阶段的历史，不适合作为正式项目执行事件。

可部分参考但不直接复用：

- `ProjectMilestone`：有项目关联、状态和时间字段，但语义更像里程碑，可多个并存，不保证唯一当前动作。
- `ProjectIssue`：语义是异常、投诉、问题反馈，不适合表达正常推进动作。
- `ProviderWorkProposal`：依赖 Work 和 Provider，服务 Marketplace/服务商方案，不适合私人项目内部动作。
- `ProjectOrder`：交易/预订语义，不适合非交易推进。
- `ProjectProduct`：商品/预订 SKU 语义，不适合启动清单。
- `CooperationRequest`：询盘/合作请求语义，不适合 owner 与平台之间的当前动作。

## 5. 不适合复用的模型

不建议复用 `ProjectIntakeEvent`：

- 它属于启动草稿和平台评估生命周期。
- 正式项目后续可能持续多年，继续写入 intake event 会让评估历史和执行历史混杂。

不建议复用 `ProjectIssue`：

- Issue 表示问题、异常或投诉。
- V2.0B.4.2.4 的当前动作是正常推进，不是问题单。

不建议复用 `ProjectMilestone`：

- Milestone 允许多个记录，不天然保证一个当前 ACTIVE 动作。
- `stage` 是字符串，不适合服务端白名单。
- 它更像项目进度节点，不适合承载 owner 可提交结果、平台确认、取消原因、唯一动作并发控制。

不建议复用 `ProviderWorkProposal`：

- 它依赖 Provider 和 Work。
- 本轮服务商不可见，不进入 Marketplace。

不建议复用 `ProjectOrder` / `ProjectProduct`：

- 会引入交易、预订或商品语义，违反本轮边界。

## 6. 三种数据方案比较

### 方案 A：直接扩展 CollaborationProject

可能字段：

- `executionStage`
- `currentActionType`
- `currentActionOwner`
- `currentActionTitle`
- `currentActionInstructions`
- `currentActionDueAt`
- `currentActionStartedAt`
- `currentActionCompletedAt`
- `currentActionVersion`

优点：

- 读取简单。
- 一个项目天然只有一个当前动作。

风险：

- 已完成动作历史难以保留。
- 新动作会覆盖旧动作。
- 用户提交结果、平台确认、取消原因、事件线都需要额外字段。
- 字段会持续膨胀。
- 不利于后续审计。

结论：不推荐作为主方案。

### 方案 B：新增轻量正式项目动作模型

推荐模型名：`CollaborationProjectAction`

建议同时新增轻量正式项目事件模型：`CollaborationProjectEvent`

优点：

- 保留历史动作。
- 可以通过数据库唯一约束保证每个项目最多一个 ACTIVE / WAITING_PLATFORM_CONFIRMATION 动作。
- 可以清晰区分 USER / PLATFORM 责任方。
- 用户提交结果和平台确认可以在同一动作生命周期内完成。
- 不会污染 ProjectIntakeEvent。
- 不会创建第三套项目系统。
- 查询可以通过 include 当前动作和最近事件避免 N+1。

风险：

- 需要一条独立 migration。
- 需要服务端状态机和事务控制。
- 需要新增少量后台和用户页面组件。

结论：推荐。

### 方案 C：复用现有事件、Issue 或其他模型

优点：

- 少一个新模型。

风险：

- 语义混乱。
- 权限和公开性容易继承错。
- 不能可靠表达唯一当前动作。
- 未来进入供应商、预售、订单时容易和现有业务混在一起。

结论：不推荐。

## 7. 推荐数据模型

推荐新增 `CollaborationProjectAction`。

建议字段：

- `id`
- `projectId`
- `actionType`
- `title`
- `instructions`
- `responsibility`
- `status`
- `dueAt`
- `startedAt`
- `userSubmittedAt`
- `userSubmissionNote`
- `completedAt`
- `completedById`
- `completionNote`
- `cancelledAt`
- `cancelledById`
- `cancelReason`
- `sequence`
- `createdById`
- `createdAt`
- `updatedAt`

推荐新增 `CollaborationProjectEvent`。

建议字段：

- `id`
- `projectId`
- `actionId`
- `actorId`
- `eventType`
- `note`
- `createdAt`

不建议新增通用 Task / assignee / comments / attachments。

## 8. 启动清单设计

不建议建立独立 checklist 布尔字段。

原因：

- 正式项目已建立：可由 `CollaborationProject.id` 判断。
- 原始启动资料存在：可由 `projectIntake` 关系判断。
- 平台评估已通过：可由 `ProjectIntake.status = ACCEPTED` 判断。
- 当前推进重点和责任方：应由当前 ACTIVE action 判断。
- 唯一动作是否分配：应由 action 查询判断。

用户看到的不是复选框，而是：

- 当前项目状态。
- 当前推进重点。
- 当前由谁负责。
- 需要完成什么。
- 完成后平台如何继续判断。

## 9. 首个推进目标

推荐 action type：

- `DESIGN_CLARIFICATION`：完善产品设计方向。
- `FABRIC_BRIEF`：确认面料需求。
- `SAMPLE_BRIEF`：准备打样需求。
- `PRODUCTION_FEASIBILITY`：确认生产可行性。
- `PLATFORM_PREPARATION`：等待平台准备下一阶段。

不建议包含：

- 已匹配面料。
- 已匹配工厂。
- 已进入打样。
- 已进入生产。
- 已开启预售。

这些是后续真实业务结果，不是本轮动作类型。

## 10. 责任方

推荐枚举：

- `USER`
- `PLATFORM`

显示文案：

- `USER`：需要你完成。
- `PLATFORM`：平台正在处理。

本轮不建议新增：

- `DESIGNER`
- `FABRIC_PROVIDER`
- `SAMPLE_STUDIO`
- `FACTORY`
- `BUYER`
- 多人 assignee

原因：服务商尚未加入私人项目，且本轮不做多方协作。

## 11. 动作状态机

推荐状态：

- `ACTIVE`
- `WAITING_PLATFORM_CONFIRMATION`
- `COMPLETED`
- `CANCELLED`

可暂不加入 `PLANNED`，因为第一版只需要当前动作和历史动作。

规则：

- 新动作创建后直接 `ACTIVE`。
- 一个项目最多同时一个未完成动作。
- USER 责任动作由用户提交后进入 `WAITING_PLATFORM_CONFIRMATION`。
- 平台确认后进入 `COMPLETED`。
- PLATFORM 责任动作由管理员直接完成。
- 取消动作必须记录原因。
- 完成和取消后的动作不可普通编辑。
- 新动作不得静默覆盖旧 ACTIVE 动作。

## 12. 用户提交流程

推荐更安全方案：

- 用户提交完成说明后，不直接标记 `COMPLETED`。
- 状态进入 `WAITING_PLATFORM_CONFIRMATION`。
- 平台确认后才 `COMPLETED`。

用户提交限制：

- 必须是项目 owner。
- 当前动作必须属于该项目。
- 当前动作责任方必须是 `USER`。
- 当前动作状态必须是 `ACTIVE`。
- 完成说明 0-1000 字纯文本。
- 客户端不能提交 status、completedById、projectId、ownerId、sequence、stage。
- 重复提交返回已有结果或幂等成功。

## 13. 平台处理流程

PLATFORM 责任动作：

- 用户只能看到“平台正在处理”。
- 用户不能点击完成。
- 管理员可以标记完成并填写简短完成说明。
- 管理员可以取消当前动作并记录原因。
- 管理员可以在无未完成动作时设置下一步。

不得伪造：

- 已找到供应商。
- 已完成报价。
- 已确认工厂。
- 已确认打样。
- 已获得订单。

## 14. 管理员项目后台

推荐入口：`/admin/projects/[id]`

理由：

- 正式项目执行不应长期挂在 ProjectIntake 评估页。
- `/admin/project-intakes/[id]` 只保留转化结果和正式项目入口。

管理员详情页应展示：

- 项目名称。
- owner 最小信息。
- `PRIVATE` 标识。
- `CollaborationProject.status`。
- 原始启动记录入口。
- 当前动作。
- 历史动作时间线。
- 设置下一步区域。

列表页 `/admin/projects` 建议增加过滤：

- 待设置第一步。
- 等待用户行动。
- 等待平台行动。
- 等待平台确认。
- 当前步骤已完成、待安排下一步。
- 全部私人项目。

## 15. 用户工作台

推荐入口继续使用：`/me/projects/collaboration/[id]`

用户页面应显示：

- 当前唯一下一步。
- 责任方。
- 说明。
- 截止日期。
- 完成后会发生什么。
- 历史时间线。

如果没有动作：

- 显示“等待平台安排第一步”。
- 不显示用户提交按钮。

## 16. 阶段设计

建议 stage 是展示层推导，而不是第一版单独持久化。

推荐显示阶段：

- `PROJECT_SETUP`
- `DESIGN_DIRECTION`
- `FABRIC_PREPARATION`
- `SAMPLE_PREPARATION`
- `PRODUCTION_PREPARATION`

推导方式：

- 根据当前 action type 或最近 completed action type 推导。
- `CollaborationProject.status` 仍表示项目生命周期。
- action 表示当前具体要做什么。

后续如果阶段需要独立审计历史，再考虑持久化 stage 和 stage event。

## 17. 时间线

不建议继续使用 `ProjectIntakeEvent` 作为正式项目执行时间线。

推荐新增 `CollaborationProjectEvent`。

推荐事件：

- `PROJECT_CREATED`
- `ACTION_CREATED`
- `USER_RESULT_SUBMITTED`
- `ACTION_COMPLETED`
- `ACTION_CANCELLED`
- `NEXT_ACTION_CREATED`

动作模型也可作为时间线主要来源，但单独事件模型更利于展示和审计。

事件不应包含：

- 数据库模型名。
- 内部枚举。
- 管理员 ID。
- Prisma 错误。
- 敏感审核信息。
- 完整用户创意全文。

## 18. Notification

复用现有 `Notification`。

需要通知：

- 管理员创建 USER 动作：`项目有新的下一步`。
- 管理员确认用户结果：`当前项目步骤已完成`。
- 管理员创建 PLATFORM 动作：`平台正在推进你的项目`。
- 管理员取消或替换动作：`项目下一步已更新`。

要求：

- 使用安全 URL 函数。
- 不包含完整 ideaText。
- 不包含用户提交全文。
- 不包含管理员个人信息。
- 不包含服务商信息。
- 不承诺供应链结果。
- 不发短信、邮件、Push。
- Notification 不是事实来源。

## 19. AdminLog

复用 `AdminLog`。

建议 action：

- `COLLABORATION_PROJECT_ACTION_CREATE`
- `COLLABORATION_PROJECT_ACTION_COMPLETE`
- `COLLABORATION_PROJECT_ACTION_CANCEL`
- `COLLABORATION_PROJECT_USER_RESULT_CONFIRM`

AdminLog 只记录：

- actionId。
- projectId。
- actionType。
- responsibility。
- oldStatus / newStatus。

不记录完整用户提交说明，不记录完整项目创意。

## 20. 幂等

建议：

- 用户提交完成结果时，以当前 actionId + ownerId + ACTIVE 状态为准。
- 如果动作已进入 `WAITING_PLATFORM_CONFIRMATION` 且已有提交，重复提交返回已有结果。
- 管理员创建动作时，如果已有 ACTIVE 或 WAITING 动作，返回 409 或已有当前动作。
- Notification 做短窗口去重。
- Event 使用事务内条件判断避免重复。

## 21. 并发

需要数据库级安全：

- `expectedUpdatedAt` 或 action `version`。
- 条件更新。
- 事务。
- 捕获 Prisma `P2002` / `P2034`。
- 有界重试。

建议唯一约束：

- PostgreSQL 部分唯一索引：同一 `projectId` 仅允许一个 `status IN ('ACTIVE', 'WAITING_PLATFORM_CONFIRMATION')` 的 action。

Prisma schema 不直接支持部分索引，应在 migration SQL 中手写：

```sql
CREATE UNIQUE INDEX "CollaborationProjectAction_one_open_action_key"
ON "CollaborationProjectAction"("projectId")
WHERE "status" IN ('ACTIVE', 'WAITING_PLATFORM_CONFIRMATION');
```

## 22. 事务边界

创建动作事务：

- 读取项目。
- 验证 PRIVATE / owner / intake relation。
- 检查无未完成动作。
- 创建 action。
- 创建 event。
- 创建 AdminLog。
- 创建 Notification。

用户提交事务：

- 读取当前 action。
- 验证 owner。
- 验证 responsibility = USER。
- 验证 status = ACTIVE。
- 更新 action 到 WAITING_PLATFORM_CONFIRMATION。
- 创建 event。
- 创建 Notification 或 AdminLog 必要记录。

管理员确认事务：

- 读取 action。
- 验证 status = WAITING_PLATFORM_CONFIRMATION 或 PLATFORM ACTIVE。
- 更新 action 到 COMPLETED。
- 创建 event。
- 创建 AdminLog。
- 创建 Notification。

取消事务：

- 读取 action。
- 验证未完成。
- 校验 cancelReason。
- 更新 action 到 CANCELLED。
- 创建 event。
- 创建 AdminLog。
- 创建 Notification。

## 23. 权限矩阵

未登录用户：

- 不能读取私人项目。
- 不能读取动作。
- 不能提交完成结果。
- 不能管理阶段。

项目 owner：

- 可读取自己的 PRIVATE 项目。
- 可读取当前动作和历史动作。
- USER 动作时可提交完成结果。
- 不能创建动作。
- 不能完成 PLATFORM 动作。
- 不能设置 stage。
- 不能修改 responsibility。
- 不能修改 visibility。
- 不能公开项目。

其他普通用户：

- 完全不可读。
- 不能通过猜 ID 访问。

服务商：

- 本轮与普通用户相同。
- 不进入私人项目。
- 不读取动作。
- 不读取用户完成说明。

管理员：

- 可查看私人项目。
- 可创建当前动作。
- 可确认用户提交。
- 可完成平台动作。
- 可取消当前动作。
- 可设置下一步。
- 不能通过 GET 修改数据。
- 不能同时创建多个 ACTIVE 动作。

## 24. 私有隔离

必须继续保证：

- `CollaborationProject.visibility = PRIVATE`。
- 不进入 `/projects`。
- 不进入公开详情。
- 不进入首页。
- 不进入搜索。
- 不进入 sitemap。
- 不进入 metadata。
- 不生成公开 OG。
- 不进入排行榜。
- 不进入服务商机会。
- 不进入 ProviderProposal。
- 不进入 Marketplace。
- 不进入 Preorder。

动作和用户完成说明：

- 仅 owner/admin 可读。
- 不写入公开字段。
- 不写入 AdminLog 全文。
- 不写入 Notification 全文。
- 纯文本显示。
- noindex。

## 25. N+1 避免

用户列表：

- 一次查询 private projects。
- include/select 当前未完成 action。
- include/select 最近一条 event 或计数。
- 不逐行查 actions。

管理员列表：

- 分页。
- pageSize 上限。
- select owner 最小信息。
- select projectIntake 最小信息。
- select 当前 action。
- 不读取完整 completionNote。
- 不读取敏感账号字段。

详情页：

- 单次查询项目、owner、intake、当前 action、历史 actions/events。
- 历史列表 take 限制。

## 26. 移动端

用户页：

- 一个主按钮。
- 长说明自动换行。
- 时间线单列。
- 没有动作时显示等待平台安排。
- PLATFORM 动作不显示用户提交按钮。
- USER 动作显示唯一“提交完成结果”按钮。

管理员页：

- 创建动作表单手机可用。
- 自定义确认界面不超过视口。
- 键盘不遮挡提交按钮。
- 不依赖 hover。

## 27. 是否需要 migration

需要 migration。

原因：

- 当前没有正式项目唯一当前动作模型。
- 当前没有正式项目执行事件模型。
- 当前没有数据库级唯一保护。
- 当前没有动作责任方、动作状态和用户提交结果字段。

## 28. migration 范围

建议新增：

- `CollaborationProjectActionType`
- `CollaborationProjectActionResponsibility`
- `CollaborationProjectActionStatus`
- `CollaborationProjectEventType`
- `CollaborationProjectAction`
- `CollaborationProjectEvent`

建议新增索引：

- `CollaborationProjectAction(projectId, createdAt)`
- `CollaborationProjectAction(projectId, status)`
- `CollaborationProjectAction(createdById)`
- `CollaborationProjectAction(completedById)`
- `CollaborationProjectEvent(projectId, createdAt)`
- `CollaborationProjectEvent(actionId, createdAt)`
- `CollaborationProjectEvent(actorId)`

建议手写部分唯一索引：

- 同一项目最多一个 ACTIVE / WAITING_PLATFORM_CONFIRMATION action。

不应：

- 删除现有表。
- 删除现有字段。
- 重写旧项目。
- 给旧项目虚构已完成动作。
- 自动公开项目。
- 自动创建供应商记录。
- 修改 ProjectIntake 历史。
- 修改 Work 核心语义。
- 开启 Feature Flag。

## 29. 旧项目兼容

旧私人正式项目应显示：

- `等待平台安排第一步`

不应在 migration 中为旧项目虚构 action。

管理员可以后续手动创建第一步。

## 30. 预计修改文件

预计修改：

- `prisma/schema.prisma`
- `src/lib/private-collaboration-projects.ts`
- `src/lib/commercial-collaboration-actions.ts`
- `src/app/me/projects/page.tsx`
- `src/app/me/projects/collaboration/[id]/page.tsx`
- `src/app/admin/projects/page.tsx`
- `src/app/admin/project-intakes/[id]/page.tsx`
- `src/lib/notifications.ts` 或复用现有安全函数时不改

预计新增：

- 一条 migration。
- `src/lib/private-project-actions.ts`
- `src/lib/private-project-actions/validation.ts`
- `src/components/admin/PrivateProjectActionPanel.tsx`
- `src/components/projects/PrivateProjectActionCard.tsx`
- `src/app/admin/projects/[id]/page.tsx`
- `src/app/api/admin/projects/[id]/actions/route.ts`
- `src/app/api/admin/projects/[id]/actions/[actionId]/complete/route.ts`
- `src/app/api/admin/projects/[id]/actions/[actionId]/cancel/route.ts`
- `src/app/api/me/projects/collaboration/[id]/actions/current/submit/route.ts`
- 测试脚本 11 个。

预计修改文件数量：约 8-10。

预计新增文件数量：约 15-18。

## 31. 测试计划

建议新增测试：

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

实施阶段还应运行：

- V2.0B.4.2.3 转化测试。
- V2.0B.4.2.2 review 测试。
- V2.0B.4.2.1 start tests。
- 原有回归测试。
- Prisma format / validate / generate。
- TypeScript。
- Production build。
- PostgreSQL 16 空库全量 migration 重放。

本审计阶段未执行测试和构建。

## 32. 本轮不做事项

- 不做供应商加入项目。
- 不自动匹配面料商。
- 不自动匹配打样师。
- 不自动匹配工厂。
- 不公开项目。
- 不开放 Marketplace。
- 不创建 ProviderProposal。
- 不报价。
- 不创建样品订单。
- 不创建工厂订单。
- 不做预售。
- 不支付。
- 不合同。
- 不聊天。
- 不文件上传。
- 不图片上传。
- 不视频。
- 不多人协作。
- 不甘特图。
- 不看板。
- 不通用任务系统。
- 不 AI 自动决定阶段。
- 不 AI 自动完成动作。
- 不批量推进。
- 不自动短信。
- 不自动邮件。
- 不 Push。
- 不 Demand V2.1。
- 不 Marketplace V2.2。
- 不 Preorder V2.3。

## 33. 风险

主要风险：

- 部分唯一索引需要手写 SQL，必须在 PostgreSQL 16 空库重放验证。
- 若 action 状态设计过宽，容易滑向通用任务系统。
- 若复用 CollaborationProject.status 表示当前动作，会与公开项目生命周期冲突。
- 若 Notification 或 AdminLog 记录全文，会泄露用户创意或提交说明。
- 若私有项目被 `canViewProject` 误当作 participant project 暴露，需要继续限制公开入口。

## 34. 推荐实施顺序

1. 新增 enum、action、event schema 和独立 migration。
2. 新增服务端 action 状态机函数。
3. 新增权限与验证函数。
4. 新增管理员项目详情页和动作面板。
5. 更新用户私人项目工作台。
6. 接入 Notification、AdminLog、事件时间线。
7. 加入列表过滤和 N+1 控制。
8. 新增测试脚本。
9. 执行 Prisma、测试、TypeScript、build、migration 重放。
10. 生成实施报告和干净 ZIP。

## 35. 审计结论

推荐进入实施，但实施前应明确采用方案 B：

- 新增独立轻量 `CollaborationProjectAction`。
- 新增独立轻量 `CollaborationProjectEvent`。
- 不扩展成通用任务系统。
- 不复用 ProjectIntakeEvent。
- 不复用 Issue、Order、ProviderProposal 或 Milestone 承载唯一当前动作。
- 需要独立 migration。
- 继续保持所有转化项目 PRIVATE。
- 用户提交后不直接完成，进入等待平台确认。
- 管理员后台入口建议为 `/admin/projects/[id]`。
- 用户入口继续为 `/me/projects/collaboration/[id]`。
