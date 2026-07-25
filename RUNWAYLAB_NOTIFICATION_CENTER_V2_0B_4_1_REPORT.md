# RunwayLab V2.0B.4.1 Unified Notification Center Report

## 基线

- 当前基线 commit：`14655b9f7eb79d8e3b78fe55e0f61303f47a06fe`
- 本地目录不是 Git 仓库，差异核对基于 `runwaylab-14655b9.bundle` 解出的基线树完成。

## 交付范围

- Notification model 基础消息中心足够：支持用户消息、未读、已读、标题、内容、站内跳转和创建时间排序。
- Notification model 完整事件治理不足：缺少原生事件枚举、actor、业务对象 ID、readAt、eventKey/dedupeKey、聚合计数。
- 本轮未修改 Prisma schema，未新增 Migration。
- 本轮未修改依赖、构建配置或部署配置。
- 通知失败只记录安全日志，不影响评论、下架、询盘、推荐等核心业务结果。

## 文件统计

- 修改文件数量：12
- 新增文件数量：14
- 总文件数量：26

## 最终真实接入事件

最终真实接入 12 类事件：

| 事件 | 触发入口文件 | recipient 如何确定 | targetUrl | 防止自通知 | 失败影响核心业务 | 去重规则 |
| --- | --- | --- | --- | --- | --- | --- |
| `COMMENT_CREATED` | `src/app/api/works/[id]/comments/route.ts` | 服务端查询作品 `work.userId` | `/works/${work.id}` | `actorId: user.id` | 不影响，评论事务完成后通知 | 不做时间窗口去重，保留真实评论通知 |
| `WORK_APPROVED` | `src/app/api/admin/works/[id]/route.ts` | 管理端更新后的 `work.userId` | `/works/${work.id}` | `actorId: admin.id` | 不影响，审核完成后通知 | 统一通知服务时间窗口去重 |
| `WORK_REJECTED` | `src/app/api/admin/works/[id]/route.ts` | 管理端更新后的 `work.userId` | `/me/works` | `actorId: admin.id` | 不影响，审核完成后通知 | 统一通知服务时间窗口去重 |
| `WORK_OFFLINED` | `src/app/api/admin/works/[id]/route.ts`, `src/app/api/works/[id]/route.ts` | 管理端或管理员生命周期入口更新后的 `work.userId` | `/me?tab=works` | 管理员 actor；owner 主动下架不通知 | 不影响，下架完成后通知 | 统一通知服务时间窗口去重 |
| `INCUBATION_RECOMMENDED` | `src/app/api/works/[id]/incubation-recommend/route.ts` | 服务端查询作品 `work.userId` | `/me/incubation` | `actorId: user.id` | 不影响，推荐事务完成后通知 | 只在新推荐记录创建后通知 |
| `INCUBATION_CANDIDATE` | `src/app/api/admin/works/[id]/route.ts` | 管理端更新后的 `work.userId` | `/me/incubation` | `actorId: admin.id` | 不影响，候选处理完成后通知 | 统一通知服务时间窗口去重 |
| `INQUIRY_RECEIVED` | `src/app/api/cooperation-requests/route.ts` | 服务端查询服务商 `provider.ownerId` | `/provider-center/inquiries` | `actorId: user.id` | 不影响，询盘创建后通知 | 统一通知服务时间窗口去重 |
| `INQUIRY_REPLIED` | `src/app/api/cooperation-requests/[id]/replies/route.ts` | 服务端根据询盘双方确定对方用户 | `/me/inquiries` 或 `/provider-center/inquiries` | `actorId: user.id` | 不影响，回复创建后通知 | 统一通知服务时间窗口去重 |
| `FABRIC_RECOMMENDED` | `src/app/api/works/[id]/fabric-recommendations/route.ts` | 服务端查询作品 `work.userId` | `/works/${work.id}` | `actorId: user.id` | 不影响，推荐创建后通知 | 业务唯一约束 + 统一通知服务去重 |
| `PROVIDER_PROPOSAL_RECEIVED` | `src/app/api/works/[id]/provider-proposals/route.ts` | 服务端查询作品 `work.userId` | `/works/${work.id}` | `actorId: user.id` | 不影响，方案创建后通知 | 业务数量限制 + 统一通知服务去重 |
| `PROVIDER_PROPOSAL_UPDATED` | `src/app/api/works/[id]/fabric-recommendations/[recommendationId]/route.ts` | 服务端查询推荐创建者或服务商 owner | `/provider-center/recommendations` | `actorId: user.id` | 不影响，状态更新后通知 | 业务状态机 + 统一通知服务去重 |
| `REQUEST_HANDLED` | `src/app/api/cooperation-requests/[id]/contact/route.ts` | 服务端查询询盘服务商 owner | `/provider-center/inquiries` | `actorId: user.id` | 不影响，授权更新后通知 | 统一通知服务时间窗口去重 |

## 评论事件

- `COMMENT_CREATED` 已接入。
- 评论通知正文使用 `safeNotificationSummary(..., 160)`，并经过邮箱、手机号、微信、WhatsApp 脱敏。
- client 不能提交 `recipientId`。
- 评论者评论自己的作品时，统一通知服务通过 actor/recipient 判断阻止自通知。
- 删除评论后不强制删除历史通知；通知目标仍是作品详情页，评论不存在也不应导致作品页 500。

## 评论回复

- `COMMENT_REPLIED` 未接入。
- 原因：当前 `Comment` 模型没有 `parentId`、`replyToId`、`rootCommentId` 或其他稳定回复关系。
- 结论：`COMMENT_REPLIED` 需要后续评论线程能力；本轮不伪造回复通知，不修改 Prisma schema。

## 作品下架

- `WORK_OFFLINED` 已接入。
- 管理员下架通知 owner。
- owner 自己主动下架不产生自己的通知。
- 通知目标为 `/me?tab=works`，不跳转到访客不可访问的公开作品页。
- 下架通知不修改作品状态，不会重新公开作品。
- 公开作品规则仍要求 `ReviewStatus.APPROVED` 且 `ContentStatus.VISIBLE`，下架作品对访客保持不可见。

## 孵化推荐

- `INCUBATION_RECOMMENDED` 已接入。
- 真实入口为 `src/app/api/works/[id]/incubation-recommend/route.ts`。
- 同一用户对同一作品已有推荐记录时，不重复通知。
- 自己推荐自己的作品时，通过 actor/recipient 判断阻止自通知。
- 通知失败不回滚推荐业务。

## 主动暂缓事件

- 点赞、收藏不是代码遗漏，而是基于通知噪音与去重安全主动暂缓。
- 当前模型缺少 `eventKey`、`dedupeKey`、`aggregateCount`、`sourceEntityType`、`sourceEntityId`、actor 聚合和取消后的产品规则。
- 本轮未接入 `WORK_LIKED` 和 `WORK_FAVORITED`，避免按标题、targetUrl 或时间窗口做不可靠去重。
- `CHALLENGE_RESULT` 后续事件，不属于 V2.0B.4.1 上线阻塞事件；本轮未修改挑战业务。

## 验证

- 五项新增测试：通过
- 21 项回归测试：通过
- `npx prisma format`：通过
- `npx prisma validate`：通过
- `npx prisma generate`：通过
- `npx tsc --noEmit`：通过
- `npm run build`：通过
- 差异空白检查：通过

## 交付包

- ZIP 文件名：`runwaylab-notification-center-v2.0b.4.1.zip`
- ZIP 文件数：26
- ZIP 大小：见最终输出
- 不包含 `.env` / `.env.*`
- 不包含 `.git`
- 不包含 `node_modules`
- 不包含 `.next`
- 不包含 `.vercel`
- 不包含 `public/uploads`
- 不包含 `prisma/schema.prisma`
- 不包含 `prisma/migrations`
- 不包含 `package.json` / `package-lock.json`
- 不包含 `tsconfig.json`
- 不包含部署配置、数据库文件、日志、缓存、其他 ZIP、Git Bundle、sha256 或密钥

## 操作声明

- 未 commit
- 未 push
- 未部署
- 未操作生产数据库
