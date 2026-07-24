# RunwayLab Content Lifecycle V2.0B.3.6 Report

基线 commit：`edb7eee7cc182071831250fdc9f7aef5051b7f39`（来自 `runwaylab-edb7eee.bundle` 的 `refs/heads/main`）。

## 本轮范围

本轮只做无 Prisma Migration 的安全修复：统一作品、服务商面料、服务商案例、询盘的删除/下架/撤回/关闭/恢复边界；保护已有作品互动、推荐、询盘、孵化、预售和项目记录。

未执行 commit、push、部署；未连接或修改生产数据库；未开启 Demand V2.1、Project Marketplace V2.2、Limited Preorder V2.3、真实短信或真实支付。

交付文件统计：修改文件 8 个，新增文件 9 个，总文件 17 个。

配置说明：未修改 `tsconfig.json`；未修改依赖、构建配置或部署配置。

## 实体生命周期结果

### Work

- 已实现：无依赖且处于 `PENDING` / `REJECTED` 的作品可永久删除。
- 已实现：`APPROVED` + `VISIBLE` 的公开作品可下架为 `ReviewStatus.OFFLINE` + `ContentStatus.OFFLINE`。
- 已实现：已下架作品可重新提交审核，回到待审核和可见草稿流程。
- 已阻止：存在评论、点赞、收藏、推荐、询盘、孵化、预售、项目、订单或机会兴趣等依赖时，`DELETE /api/works/[id]` 返回 409 和公开依赖摘要。
- schema 限制未实现：真正的“归档”和“恢复原发布状态”需要记录前置状态或新增归档字段，留给后续 Migration。

### Provider Fabric（当前 schema 模型为 `Fabric`）

- 已实现：`ACTIVE` 面料可下架为 `INACTIVE`，公开面料库和公开详情只显示 `ACTIVE`。
- 已实现：`INACTIVE` / `ARCHIVED` 面料可恢复为 `ACTIVE`。
- 已实现：`INACTIVE` / `UNKNOWN` 且无推荐、询盘、项目依赖的面料可永久删除。
- 已阻止：已有 `WorkFabricRecommendation`、`CooperationRequest`、`CollaborationProject` 依赖的面料不能永久删除。
- schema 限制未实现：更细粒度的归档原因、审计日志、历史版本需要后续 Migration。

### Provider Showcase

- 已实现：`PUBLISHED` 案例可下架为 `ARCHIVED`，公开详情只允许访问 `PUBLISHED`。
- 已实现：`ARCHIVED` 案例可重新提交为 `PENDING_REVIEW`。
- 已实现：`DRAFT` / `REJECTED` / `PENDING_REVIEW` 且无询盘依赖的案例可永久删除。
- 已阻止：已有询盘或业务记录的案例不能永久删除。
- schema 限制未实现：恢复原发布状态、归档原因、审计日志需要后续 Migration。

### CooperationRequest

- 已实现：发起方可撤回尚未回复的 `PENDING` 询盘，记录保留并转为 `CLOSED`。
- 已实现：发起方可关闭进行中的询盘。
- 已实现：服务商可标记已查看、感兴趣、关闭询盘、完成合作。
- 已阻止：`CLOSED` / `COMPLETED` 后不能继续回复，也不能回退到普通处理中状态。
- 未提供：用户永久删除单条询盘或回复。

## UI 结果

- 已新增轻量确认对话组件 `LifecycleActionButton`，替代浏览器原生 `confirm()`。
- 我的作品：删除草稿、下架作品、重新提交均有对象名称、影响说明、loading 防重复点击和成功/失败反馈。
- 服务商面料：编辑、下架面料、恢复展示、删除草稿分层展示。
- 服务商案例：编辑、下架案例、重新提交、删除草稿分层展示。
- 询盘：撤回、关闭、完成合作均有明确确认说明；关闭和下架不是红色硬删除。

## Prisma 与 Migration

- 未新增 Prisma Migration。
- 未新增 schema 字段或 enum。
- 未修改 `prisma/schema.prisma`。

## 新增测试

- `scripts/work-lifecycle-tests.ts`
- `scripts/provider-fabric-lifecycle-tests.ts`
- `scripts/provider-showcase-lifecycle-tests.ts`
- `scripts/cooperation-request-lifecycle-tests.ts`
- `scripts/destructive-action-ui-tests.ts`

新增测试结果：全部通过。

既有回归脚本结果：全部通过。

## 验证结果

- `npx prisma format`：通过。
- `npx prisma validate`（使用一次性本地 PostgreSQL 16 审计数据库）：通过。
- `npx prisma generate`（使用一次性本地 PostgreSQL 16 审计数据库）：通过。
- `npx tsc --noEmit`：通过。
- `npm run build`（使用一次性本地 PostgreSQL 16 审计数据库）：通过。
- `git diff --check`：未通过运行环境校验；当前 `runwaylab` 目录不是 Git 仓库。

## 下一批建议

- 增加 Work / Fabric / Showcase 的归档原因、操作者、操作时间和前置状态字段。
- 增加 AdminLog 覆盖管理员危险操作。
- 为询盘增加 `WITHDRAWN` 或独立撤回状态，避免用 `CLOSED` 同时表达关闭和撤回。
- 本轮临时基线检查目录已改名为 `__patch_baseline_edb7eee_check_20260724_*`，使用基线已有的 `__patch_*` 排除规则，未修改 `tsconfig.json`。
