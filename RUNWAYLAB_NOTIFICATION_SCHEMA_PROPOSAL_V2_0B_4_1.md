# RunwayLab V2.0B.4.1 Notification Schema Proposal

## 结论

当前 `Notification` 模型可以支撑站内消息中心的基础能力：

- 按用户读取消息
- 未读数量
- 单条已读
- 全部已读
- 标题、内容、跳转地址
- 创建时间排序

但它不足以完整承载 V2.0B.4.1 的长期事件治理能力。

## 当前模型缺口

- `NotificationType` 枚举较粗，不能独立保存询盘、推荐、评论、点赞、收藏、下架、挑战等细分事件。
- 缺少 `actorId`，无法在数据库层记录触发通知的人。
- 缺少业务对象字段，例如 `workId`、`providerId`、`inquiryId`、`proposalId`。
- 缺少 `readAt`，无法区分首次已读时间和更新时间。
- 缺少事件去重键，无法在数据库层做强约束去重。
- 缺少事件来源字段，无法稳定绑定评论、点赞、收藏、询盘、推荐等来源对象。
- 缺少聚合字段，无法安全表达“3 人赞了你的作品”这类低噪音通知。
- 缺少取消事件策略，无法定义取消点赞或取消收藏后是否撤销未读通知。

## 建议后续 schema

```prisma
enum NotificationEventType {
  COMMENT_CREATED
  COMMENT_REPLIED
  WORK_APPROVED
  WORK_REJECTED
  WORK_OFFLINED
  WORK_LIKED
  WORK_FAVORITED
  INQUIRY_RECEIVED
  INQUIRY_REPLIED
  FABRIC_RECOMMENDED
  PROVIDER_PROPOSAL_RECEIVED
  PROVIDER_PROPOSAL_UPDATED
  INCUBATION_RECOMMENDED
  INCUBATION_CANDIDATE
  CHALLENGE_RESULT
}

model Notification {
  id        String                @id @default(cuid())
  userId    String
  actorId   String?
  type      NotificationEventType
  eventKey  String?
  title     String
  content   String
  linkUrl   String?
  isRead    Boolean               @default(false)
  readAt    DateTime?
  sourceEntityType String?
  sourceEntityId String?
  workId    String?
  providerId String?
  inquiryId String?
  proposalId String?
  dedupeKey String?
  aggregateCount Int?
  createdAt DateTime              @default(now())
  updatedAt DateTime              @updatedAt

  user      User                  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt])
  @@index([actorId])
  @@unique([userId, eventKey])
  @@unique([userId, dedupeKey])
}
```

## 点赞与收藏后续建议

- 为每个事件增加稳定 `eventKey` 或 `dedupeKey`，例如 `work-like:{workId}` 和 `work-favorite:{workId}`。
- 支持同一作品点赞聚合，避免每次点赞都生成一条新通知。
- 支持“3 人赞了你的作品”这类聚合文案。
- 取消点赞不产生新通知。
- 是否撤销未读点赞通知需要独立产品规则，不能在本轮用删除历史通知替代。
- 禁止使用标题、targetUrl 或短时间窗口来猜测去重。

## 本补丁处理方式

本次按要求未修改 Prisma schema，未新增 Migration。可安全映射到现有枚举的事件已通过统一通知服务接入；无法原生表达的事件保留为未接入项。
