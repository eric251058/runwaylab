# RUNWAYLAB START PROJECT V2.0B.4.2.1 AUDIT

版本：V2.0B.4.2.1 公共定位升级与 60 秒启动项目

实施决策更新：

- 审计结论已采用方案 B：新增最小 `ProjectIntake` 模型。
- `ProjectIntake` 只记录 60 秒启动草稿，不承载长期项目进度。
- 本轮使用 `ownerId + clientDraftId` 做幂等约束。
- `ownerId` 仅来自服务端 session。
- 草稿默认私有，只允许 owner 与现有管理员读取。
- 图片采用安全简化方案 B：启动流程暂不上传草稿图片，只保存一句话描述；不把公开 `/uploads` 描述成私有存储。

审计范围：

- 首页结构、Hero、CTA、移动端布局与首页数据加载
- `/me/projects`、`/me/projects/[id]`、`src/lib/project-workbench.ts`
- `Work`、`IncubationApplication`、`IncubationProject`、`CollaborationProject`
- `FabricRequest`、`SampleRequest`、`CooperationRequest`
- 上传系统 `/api/upload`、`StorageService`、`public/uploads`
- 登录后返回机制、现有本地草稿能力、角色权限、通知与后台日志

## 关键结论

现有 `Work` 不适合作为“尚无完整设计稿的创业项目草稿”根对象；现有 `IncubationApplication` 和 `CollaborationProject` 也都依赖 `workId`，无法自然承载“用户只有产品想法、尚无公开作品”的启动入口。

建议新增一个最小入口模型，例如 `ProjectIntake`，只作为“启动草稿 / 入门记录”，并通过可空字段绑定后续真实业务对象。它不替代现有 `CollaborationProject`，也不进入公开作品流、公开项目广场或孵化池。

因此，本轮如继续实现完整目标，需要 Prisma schema 修改和独立 migration。

## 先回答 15 个问题

1. 现有 `Work` 是否适合承载尚无完整设计稿的创业项目草稿？

不适合。`Work` 当前承担公开作品、审核、作品统计、首页/作品流、互动、孵化推荐、评论、收藏、分享、AI 诊断等核心职责。即使把草稿设为 `PENDING` 或 `HIDDEN`，仍会进入作品作者的作品集合、后台作品治理、工作台聚合和相关统计语义中，并要求伪造标题、描述、类别等作品字段。

2. 是否会污染公开作品、审核和作品统计？

会。公开列表有 `APPROVED + VISIBLE + 可用图片 + 有效标题/描述` 的质量过滤，能挡住大部分公开展示污染，但不能阻止草稿污染 `Work` 数量、用户作品列表、后台作品审核队列、项目工作台、作品生命周期和通知语义。

3. 现有 `IncubationApplication` 是否可以承载启动申请？

不适合。它强依赖 `workId`，语义是“围绕已有作品申请孵化”，不是“先启动一个产品想法”。把无作品用户强行创建假 Work 再创建 `IncubationApplication` 会绕回 Work 污染问题。

4. 当前项目工作台是否只能以 `Work` 为根对象？

是。`getDesignerProjectWorkbench(userId)` 当前只查询 `prisma.work.findMany({ where: { userId } })`，所有阶段、任务、时间线都基于 Work 及其关联业务对象实时计算。`/me/projects/[id]` 的 `id` 实际也是 `workId`。

5. 用户尚无作品时，如何进入工作台？

现状只能看到空状态并被引导去 `/publish`。新方案需要在 `/me/projects` 聚合 `ProjectIntake` 草稿，空状态主按钮改为“启动第一个项目”，已有项目用户展示轻量“新建项目”入口。

6. 是否必须新增最小启动申请模型？

是。为了避免伪造公开 Work、污染作品审核和统计，建议新增最小模型 `ProjectIntake`。这是最低风险的数据承载方案。

7. 如果新增模型，如何确保它只是“入口记录”，而不是第二套长期 Project？

模型只保存启动阶段最少字段：所有者、来源类型、产品品类、主要需求、一句话想法、起点图片、状态、完成度、以及后续绑定的 `Work` / `CollaborationProject` / `IncubationProject`。不加入订单、报价、里程碑、成员、文件版本、聊天、支付、评价等长期项目能力。启动后复杂流程继续回到现有 `Work`、`CollaborationProject` 和项目工作台。

8. 如何在后续审核通过后转换或绑定现有 `Work` / `IncubationProject`？

后台或后续评估流程可把 `ProjectIntake` 绑定到：

- 用户补充设计作品后生成或关联 `Work`
- 平台评估通过后生成 `CollaborationProject`
- 如存在作品孵化路径，再关联 `IncubationProject`

转换只新增绑定关系，不迁移历史 Work，不重写现有项目对象。

9. 如何避免重复项目？

服务端创建时根据 `ownerId + draftFingerprint` 做幂等。fingerprint 可由 `sourceType/category/primaryNeed/ideaText/imageUrl` 规范化后生成短 hash；客户端也带一个本地 `clientDraftId`，但服务端不能信任 ownerId。建议 `ProjectIntake` 增加 `clientDraftId` 并对 `[ownerId, clientDraftId]` 建唯一约束，防止重复点击。

10. 如何保存未登录用户填写内容？

使用 `sessionStorage` 保存匿名本地草稿：包含版本号、过期时间、四步字段、临时 `clientDraftId`。不把长文本、图片 URL、联系方式或 ownerId 放入 URL。解析失败、版本不兼容或过期时安全清空。

11. 如何在登录完成后回到原流程？

使用现有 `safeRedirectPath` 与 `/login?next=/start` 机制。`/start` 登录后读取 `sessionStorage` 草稿并恢复到最终确认步骤；成功创建后清理本地草稿，避免重复创建。

12. 如何避免首页和 `/start` 出现 N+1？

首页只保留少量真实内容聚合，并使用 `Promise.all` 批量查询；无真实数据的模块直接隐藏。`/start` 前三步不查数据库，最终创建时一次写入。`/me/projects` 聚合 Work 与 ProjectIntake 时使用并行查询和必要字段 select，不在每个项目循环查询。

13. 如何保证上传图片不公开泄露？

现有 `/api/upload` 要求登录并使用 `StorageService` 写入 `/uploads/...`，路径为 UUID，但 URL 本身是公开可访问的静态资源。它不会自动进入公开作品流，但不能提供严格的“只有所有者可访问”文件级授权。若本轮必须上传启动草稿图片，应至少做到：

- 未登录阶段不直接上传图片，只保留本地 File 预览；登录后再上传；
- 新增受限 upload kind，例如 `project-intake`，继续复用 `StorageService` 的类型和大小检查；
- 草稿详情 `noindex`，不输出公开 OG 图片，不进入公开列表和搜索；
- 报告中明确：基于 `public/uploads` 的图片 URL 是弱私有，强私有需要后续改为鉴权文件路由或私有对象存储。

14. 是否需要 Prisma schema 修改？

需要。最小安全实现建议新增 `ProjectIntake` 及 `ProjectIntakeStatus`，可选新增 `ProjectIntakeSourceType` / `ProjectIntakePrimaryNeed` 枚举；如果为减少 enum 扩张，也可用字符串字段并在代码层安全映射。推荐至少为 status 使用 enum。

15. 是否需要 Migration？

需要。如果继续实现完整 `/start` 创建真实启动草稿，应新增独立 migration，只添加 `ProjectIntake` 相关最小结构，不修改现有表含义，不迁移生产数据。

## 当前数据结构审计

### Work

`Work` 是公开作品体系的根对象，字段包括标题、描述、类别、作品类型、风格标签、审核状态、内容状态、原创/AI/精选/合作意向、互动计数与大量关系。它是首页、作品流、排行榜、孵化、评论、收藏、预售、AI 诊断、项目工作台的共同锚点。

适合：已经可以作为作品公开展示、审核或进入孵化路径的设计作品。

不适合：只有产品想法、没有设计稿、没有作品标题或不希望进入公开作品治理的启动草稿。

### IncubationApplication

`IncubationApplication` 强制包含 `workId`，表示某个作品的孵化申请或候选。它不适合作为无作品项目入口。

### IncubationProject

`IncubationProject` 也强制包含 `workId` 和 `designerId`，是作品进入孵化后的状态记录，不适合做匿名或半成品入口。

### CollaborationProject

`CollaborationProject` 是现有长期合作项目模型，字段丰富，支持公开/参与方/私有可见性、项目状态、优先级、目标价格、订单、里程碑、问题、产品、设计授权等。它强制包含 `workId`，并且已经是 V2.2/V2.3 长期项目与有限预订能力的核心。

适合：已有作品锚点和合作推进对象的长期项目。

不适合：60 秒启动草稿。直接复用会要求用户先有 Work，并把入口草稿过早升级为长期项目。

### FabricRequest / SampleRequest / CooperationRequest

这些模型可以 `workId` 为空，但语义分别是找面料、打样、合作询盘，且包含 contact 等下游字段。它们不适合承载“从哪里开始 / 想做什么品类 / 当前最需要什么”的入口信息。

### Notification

通知模型以 userId 为对象，适合登录后通知，不适合匿名漏斗记录。通知内容需要继续脱敏，不应记录用户完整想法或图片 URL。

### AdminLog

`AdminLog` 需要 `adminId`，主要用于后台管理员操作记录，不适合记录匿名 `/start` 漏斗。若本轮需要最小测量，可优先使用安全服务端日志；要持久化漏斗需后续单独设计轻量事件模型。

## 推荐数据承载方案

推荐方案：新增最小 `ProjectIntake`。

建议字段：

- `id`
- `ownerId`
- `sourceType`：字符串或 enum，允许 DESIGN / IDEA / AUDIENCE / STORE / BRAND
- `category`：字符串安全映射，允许 dress / shirt / outerwear / set / skirt / pants / light-formal / knit / other
- `categoryOther`
- `primaryNeed`：字符串或 enum，允许 DESIGN_DIRECTION / FABRIC / SAMPLE / PRODUCTION / MARKET_VALIDATION / UNSURE
- `ideaText`
- `imageUrl`
- `status`：enum，第一版 DRAFT / READY_FOR_REVIEW
- `completion`
- `clientDraftId`
- `linkedWorkId`
- `linkedCollaborationProjectId`
- `linkedIncubationProjectId`
- `submittedForReviewAt`
- `createdAt`
- `updatedAt`

建议索引：

- `@@index([ownerId, updatedAt])`
- `@@index([status])`
- `@@unique([ownerId, clientDraftId])`
- `@@index([linkedWorkId])`
- `@@index([linkedCollaborationProjectId])`

## 方案对比

| 方案 | 优点 | 风险 | 结论 |
| --- | --- | --- | --- |
| 复用 Work | 可以立即进入现有 `/me/projects` | 污染作品、审核、统计和通知；需要伪造作品字段；可能误入公开治理 | 不推荐 |
| 复用 IncubationApplication | 与孵化语义接近 | 强依赖 Work；无法表示无作品用户 | 不推荐 |
| 复用 CollaborationProject | 可复用长期项目能力 | 强依赖 Work；过重；会变成第二套/过早长期项目 | 不推荐 |
| 新增 ProjectIntake | 最小、私有、语义清晰；后续可绑定真实对象 | 需要 schema 和 migration | 推荐 |

## 转换路径

1. 用户通过 `/start` 创建 `ProjectIntake(DRAFT)`。
2. `/me/projects` 同时展示 Work 项目和 ProjectIntake 启动草稿，但视觉上区分“启动草稿”和“作品项目”。
3. 用户补充第一项“项目定位”，草稿状态可保持 DRAFT，completion 增加。
4. 用户点击“提交平台评估”时转为 `READY_FOR_REVIEW`。
5. 后台后续版本审核后，可绑定或创建 Work / CollaborationProject / IncubationProject。
6. 绑定后，ProjectIntake 只保留入口来源与转换记录，不承载长期项目进展。

## 权限矩阵

| 对象 | 游客 | 登录用户 | 草稿所有者 | 服务商 | 管理员 |
| --- | --- | --- | --- | --- | --- |
| `/start` 填写本地草稿 | 可以 | 可以 | 可以 | 可以 | 可以 |
| 创建 ProjectIntake | 不可以，先登录 | 可以，只能为自己创建 | 可以 | 可以 | 可以 |
| 查看 ProjectIntake 详情 | 不可以 | 不可以 | 可以 | 不可以 | 可以 |
| 更新 ProjectIntake | 不可以 | 不可以 | 可以 | 不可以 | 可以 |
| 提交评估 | 不可以 | 不可以 | 可以 | 不可以 | 可以代管 |
| 公开访问草稿 | 不可以 | 不可以 | 不可以公开分享 | 不可以 | 不建议公开 |

## 页面流程

首页：

1. Hero 新定位：把服装想法，做成真实产品。
2. 主 CTA：启动服装项目 -> `/start`。
3. 次 CTA：浏览新锐设计 -> `/works`。
4. 服务商轻量文本入口：我是服务商 -> `/providers/apply`。
5. 后续模块只展示真实数据；无数据隐藏，不显示空壳机会。

`/start`：

1. `1 / 4` 你想从哪里开始？
2. `2 / 4` 你想做什么产品？
3. `3 / 4` 你现在最需要哪一步？
4. `4 / 4` 上传一张图片，或者写一句话。
5. 未登录点击创建时跳转 `/login?next=/start`，本地草稿保留。
6. 登录后恢复草稿，点击创建写入 `ProjectIntake`。
7. 成功后进入 `/me/projects/[intakeId]` 或新增安全详情路径。

建议详情路径：

- 如不复用 Work ID 路由，应新增 `/me/start-projects/[id]` 或 `/me/projects/intakes/[id]`，避免 `/me/projects/[id]` 继续被误认为 workId。
- 如果必须整合到 `/me/projects/[id]`，需要在 loader 中先按 Work 查，查不到再按 ProjectIntake 查，并确保 ID 不可枚举权限检查。

## 状态流程

第一版只需要：

- `DRAFT`：启动草稿，默认私有，仅所有者和管理员可见。
- `READY_FOR_REVIEW`：用户已经准备提交平台评估，后台后续版本可处理。

预留但本轮不必开放：

- `SUBMITTED`
- `NEEDS_INFO`
- `ACCEPTED`
- `DECLINED`
- `CONVERTED`
- `ARCHIVED`

## 风险

1. 使用 `Work` 会污染作品体系，是最大产品和数据风险。
2. 使用 `public/uploads` 无法做到文件级强私有；只能避免公开列表和索引暴露。
3. 未登录上传与当前 `/api/upload` 认证要求冲突。建议未登录阶段只做本地预览，登录后再上传。
4. `AdminLog` 不适合匿名增长漏斗；本轮只能做服务端安全日志或另开后续最小事件模型。
5. `safeRedirectPath` 依赖 `SITE_URL`，本地/线上配置要确保 `/start` 合法回跳。
6. `/me/projects` 当前以 Work 为根，需要谨慎整合 ProjectIntake，避免把 intake ID 当 workId。
7. 若新增 schema，必须在空库验证 migration 可重放，生产只由人工执行 deploy。

## 实施文件清单建议

审计后建议继续实现时涉及：

- `prisma/schema.prisma`
- `prisma/migrations/<timestamp>_add_project_intake/migration.sql`
- `src/app/page.tsx`
- `src/app/start/page.tsx`
- `src/components/start/StartProjectFlow.tsx`
- `src/app/api/start-projects/route.ts`
- `src/app/me/projects/page.tsx`
- `src/app/me/projects/[id]/page.tsx` 或 `src/app/me/start-projects/[id]/page.tsx`
- `src/lib/start-projects.ts`
- `src/lib/start-projects/validation.ts`
- `src/lib/project-workbench.ts`
- `src/lib/storage/index.ts` 如新增 `project-intake` upload kind
- `src/app/api/upload/route.ts` 仅在需要接受新 upload kind 时小改，不改变上传核心逻辑
- `scripts/start-project-flow-tests.ts`
- `scripts/start-project-permission-tests.ts`
- `scripts/start-project-draft-tests.ts`
- `scripts/start-project-mobile-ui-tests.ts`
- `scripts/home-positioning-tests.ts`
- 如修改 schema：`scripts/start-project-schema-tests.ts`、`scripts/start-project-migration-tests.ts`

## 测试计划

新增测试：

- 首页主标题、主 CTA、次 CTA、无虚假承诺、无空壳机会模块。
- `/start` 四步流程、单屏单问题、非法 source 回退。
- 匿名草稿写入 sessionStorage、刷新恢复、版本不兼容清空。
- 未登录创建跳转 `/login?next=/start`，登录后恢复，不把长文本或图片 URL 放进 URL。
- 服务端拒绝伪造 ownerId、非法 source/category/need、超长文本、危险图片 URL。
- 创建幂等：重复点击不重复生成草稿。
- 草稿默认私有，未授权用户不能读取或更新。
- 草稿不进入 `/works`、首页作品流、公开 `/projects`。
- 详情页 metadata noindex。
- `/me/projects` 同时展示 Work 项目和 ProjectIntake 草稿，无 N+1。

回归测试：

- 保持现有 33 项脚本继续运行。
- 如新增 schema，额外检查 migration 可重放。

## 建议决策

建议进入实现前确认：允许本轮新增最小 Prisma model 和 migration。若不允许 schema 变更，则只能做首页定位与 `/start` 前端本地草稿原型，不能创建真实私有启动草稿，也不能声称完成“创建后进入工作台”闭环。
