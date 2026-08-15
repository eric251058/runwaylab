# RunwayLab V2.0B.6 Full Platform Gap Audit

审计日期：2026-08-13
基线：V2.0B.5，commit `51d94edaf8bb71e2393af81535e5159239ca38de`
开发分支：`develop/v2.0b.6-platform-foundation`

## 1. 产品结论

RunwayLab 已经具备创意社区、项目孵化、供应商协作和预订订单的较大代码基础，不应推倒重做。当前主要问题不是页面数量少，而是业务入口分散、角色工作台不统一，以及交易链停在“预订意向”而没有完成资金闭环。

正式产品采用“限量预售 + 达标生产”机制：

1. 设计完成产品化，配置价格、SKU、限量、最低成团量和截止时间。
2. 用户提交有支付约束的预订。
3. 达标后进入生产、发货、签收和售后。
4. 未达标自动取消并原路退款。
5. 平台记录订单、支付、退款、分账、佣金、结算和审计轨迹。

对外文案可使用“支持设计成真”“达标生产”，避免把该机制表达为投资、收益承诺或金融众筹。

## 2. 代码事实

- 页面：113 个 `page.tsx`
- API：69 个 `route.ts`
- 用户角色枚举：`USER`、`STUDENT_DESIGNER`、`NEW_DESIGNER`、`ADMIN`
- 已存在移动端底部导航和响应式页面壳
- App API 版本目录：0
- OpenAPI/Swagger 契约：0
- 退款、分账、佣金、结算、钱包或托管账务模型：0

已有商业模型包括：

- 意向层：`BuyerIntent`、`PresaleIntent`
- 预售层：`PresaleCampaign`、`PresaleCampaignIntent`
- 商品层：`ProjectProduct`、`ProjectSku`
- 订单层：`ProjectOrder`
- 项目履约层：`CollaborationProject`、`ProjectMilestone`、`ProjectIssue`、`ProjectDesignAuthorization`

已有客户入口包括：

- 公共预售页 `/presale`
- 项目详情中的 `LimitedPreorderPanel`
- 客户项目订单页 `/me/project-orders`
- 管理端预售活动、预售意向和项目订单页
- 项目预订接口 `/api/projects/[id]/preorders`

关键限制：

- `PresaleCampaign` 有目标数量、当前数量、日期、尺码和颜色，但没有规范化金额、定金、退款策略和成团结算字段。
- `PresaleCampaignIntent` 仅记录联系人、SKU 偏好、数量和备注。
- `ProjectOrder` 已有单价、总额、币种、支付状态、履约状态和物流信息。
- 预订接口已经调用支付适配器，但当前 `createPaymentProvider()` 在所有条件下都返回 `DisabledPaymentProvider`，并明确写入“仅记录预订意向，未开启真实支付”。
- 未发现支付回调、幂等键、退款、账本、平台佣金、服务商结算和对账闭环。

## 3. Gap Matrix

| 能力域 | 当前状态 | 证据 | 缺口 | 优先级 |
|---|---|---|---|---|
| 创意发布与发现 | 可用 | 作品、图片、点赞、收藏、评论、关注、排名、展览、挑战 | 入口和转化路径需要统一 | P1 |
| 创意确权与审核 | 基本可用 | verification、审核、举报、管理日志、AI 诊断 | 商业授权与订单绑定仍需强化 | P1 |
| 需求发起 | 可用 | ProjectIntake、start project、后台审核与转项目 | 公共需求市场与报价比较不完整 | P1 |
| 项目协作 | 基本可用 | action、event、milestone、issue、authorization | 合同、报价、费用与验收结果未形成统一对象 | P1 |
| 供应商协作 | 基本可用 | Provider、能力、面料、样衣、工厂提案、合作请求 | 多组织成员、权限和结算主体缺失 | P1 |
| 限量预售 | 部分可用 | campaign、intent、public page、project preorder | 两套预售对象未统一，仍以意向为主 | P0 |
| 商品与 SKU | 基本可用 | ProjectProduct、ProjectSku | 库存预占、销售窗口、成本与税费不完整 | P0 |
| 订单 | 基本可用 | ProjectOrder、客户页、管理页、状态规则、物流字段 | 取消原因、完整事件流和售后关联缺失 | P0 |
| 支付与退款 | 不可用 | 支付适配器为 Disabled | 实际支付、回调、幂等、退款和对账全部缺失 | P0 |
| 平台账务 | 不可用 | 无相关模型 | 佣金、分账、服务商结算、账本和发票缺失 | P0 |
| 售后与争议 | 部分可用 | ProjectIssue、Report、Review | 退货、退款、举证、裁决、SLA 缺失 | P1 |
| 运营与信任 | 基本可用 | 通知、举报、审核、案例、日志 | 商业风控和资金操作审计缺失 | P1 |
| 角色与工作台 | 部分可用 | /me、provider-center、admin | Provider/Buyer 不是统一可切换角色，多身份导航分散 | P0 |
| App-ready | 不可直接交付 | 响应式 UI、69 个 API | 无 /api/v1、令牌体系、OpenAPI、推送、深链和幂等规范 | P0 |

## 4. 版本边界

### V2.0B.6 Platform Foundation

目标：把现有能力连接成一个可理解、可导航、可供后续 App 复用的平台骨架，不改生产数据。

验收项：

- 建立唯一的 platform capability registry，统一三条核心链路、角色入口、阶段和可用状态。
- 增加公共平台总览，让客户理解“创意 → 项目 → 限量预售 → 生产交付”。
- 增加登录用户运营总览，聚合创意、项目和订单入口，不再依靠用户猜页面。
- 增加只读 `/api/v1/platform/capabilities` 契约，为 App 提前建立版本化 API 约定。
- 导航接入平台总览。
- 预售正式命名为“限量预售 / 达标生产”；保留旧模型兼容，不在本版本冒险重构 schema。
- 增加静态 contract tests、类型检查、构建和页面 smoke。
- 不启用真实支付，不迁移生产库，不部署生产。

### V2.1 Limited Preorder Transaction

- 统一 campaign、product、SKU 和 order 的销售关系。
- 加入最低成团量、销售截止时间、限量、库存预占和订单事件。
- 建立沙盒支付、回调签名、幂等、支付超时、取消与退款。
- 达标进入生产；未达标自动取消并退款。
- 客户、项目方、管理员均可查看一致状态。

### V2.2 Demand and Project Marketplace

- 公开/定向需求发布。
- 服务商匹配、报价、比较、入选与合同确认。
- 把报价金额、交付物、里程碑、验收和设计授权纳入统一项目契约。

### V2.3 Production, Fulfillment and Aftersales

- 生产排期、批次、质检、物流、签收。
- 退货、退款、争议、举证、裁决和 SLA。
- 通知与审计覆盖所有关键状态变更。

### V2.4 Settlement and Operations

- 平台佣金、服务商应收、退款冲销、结算批次、对账和导出。
- 商业风控、运营看板和异常队列。

### V3.0 App

- 令牌认证与刷新、版本化 API、OpenAPI、幂等规范。
- 推送通知、深链、上传、离线缓存和移动端发布流程。
- Web 和 App 共享业务服务，不复制状态机。

## 5. 不可妥协的产品规则

- “众筹”不是投资，不承诺收益，不出售股权。
- 订单金额使用最小货币单位保存，禁止浮点金额。
- 所有支付、退款和结算写操作必须幂等且可审计。
- 达标判断以服务端事务为准，不能信任前端 currentCount。
- 生产部署必须在完整测试、迁移审计、备份和用户确认后执行。
- 不能用“页面存在”代替“业务闭环完成”。

## 6. 当前决定

V2.0B.6 从已部署 V2.0B.5 精确基线建立独立开发分支。先完成平台骨架和只读 App 契约，再进入 V2.1 的真实交易实现。生产环境保持不变，直到独立验收通过并再次获得部署确认。
## 7. V2.0B.6 实施与验证结果

### 已完成

- 新增公开平台全景页：`/platform`。
- 新增登录后全链路工作台：`/me/platform`。
- 新增只读 App 能力契约：`GET /api/v1/platform/capabilities`。
- 新增统一能力注册表，明确创意链、项目链、交易链与五类平台角色。
- 桌面主导航和账号菜单已接入新入口。
- 未修改 Prisma schema，未新增 migration，未接真实支付，未改变生产数据。

### 验证结果

- `scripts/platform-foundation-tests.ts`：PASS。
- `npx tsc --noEmit`：PASS。
- `npm run build`：PASS。
- `scripts/*-tests.ts`：Passed scripts: 76。
- Codespace `/platform` 浏览器渲染：PASS。
- `/me/platform` 未登录访问保护：正确重定向到 `/login?next=/me/platform`。
- Codespace 当前 `DATABASE_URL_UNSET`，因此未伪报登录后私有页面运行态验收；该项留待隔离测试数据库复验。
- 生产环境、生产数据库、Vercel 部署均未改动。

# RunwayLab