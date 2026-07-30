# RUNWAYLAB START PROJECT V2.0B.4.2.1 REPORT

## 当前首页定位问题

首页原主任务是“发布作品 / 浏览作品”，更像作品展示入口。对已有产品想法、门店、品牌主理人或供应链合作方而言，第一屏不能快速说明 RunwayLab 如何帮助一个服装产品从想法进入推进流程。

## 新定位

新首页主标题为：

把服装想法，做成真实产品

副标题强调连接设计、面料、打样、供应链与市场反馈，帮助新锐设计师和品牌主理人推进第一件产品。主 CTA 改为 `/start`，次 CTA 保留 `/works`，服务商入口降为轻量文本入口。

## 为什么使用 60 秒流程

首访用户不应该先填写完整商业计划。四步流程只收集当前起点、产品品类、主要需求和一句话项目想法，让用户先建立一个私有启动草稿，后续再渐进式补充。

## 四步流程

1. 你想从哪里开始？
2. 你想做什么产品？
3. 你现在最需要哪一步？
4. 写一句话，给项目一个起点。

每一步只显示一个主要问题，移动端按钮保持大触达区域。

## 未登录草稿保存方式

`/start` 使用 `sessionStorage` 保存版本化本地草稿：`runwaylab.startProject.v1`。草稿包含 `clientDraftId`、过期时间、当前步骤和四步输入，不把长文本或图片 URL 放入 URL。

## 登录恢复方式

未登录用户点击“创建我的项目”时跳转 `/login?next=/start`。登录后回到 `/start`，客户端从 `sessionStorage` 恢复草稿，用户确认后再创建真实 `ProjectIntake`。创建成功后清除本地草稿。

## 数据承载方案

新增最小 `ProjectIntake`，字段只覆盖启动入口：

- ownerId
- clientDraftId
- sourceType
- category / categoryOther
- primaryNeed
- ideaText
- status
- completion
- 可选 linkedWorkId / linkedCollaborationProjectId / linkedIncubationProjectId

## 为什么没有创建第二套长期 Project

`ProjectIntake` 不包含订单、报价、里程碑、成员、聊天、任务系统或文件版本。它只作为入口记录，后续由现有 `Work`、`CollaborationProject`、`IncubationProject` 承接长期业务。

## 创建后如何进入工作台

创建成功后进入私有详情：

`/me/start-projects/[id]`

`/me/projects` 会并列显示当前用户的启动草稿和已有 Work 项目。启动草稿显示“启动草稿”阶段、完成度和唯一下一步。

## 下一步行动决策

优先级：

1. 未写一句话时：补充一句项目想法。
2. 已有一句话时：完善项目定位。
3. READY_FOR_REVIEW 时：等待平台评估。

## 草稿隐私

草稿详情 metadata 设置 `noindex`。服务端读取和更新均通过当前 session 用户校验，只允许 owner 或现有 ADMIN 读取/更新。草稿不进入 `/works`、排行榜、公开项目页、搜索或公开 metadata。

## 图片安全

当前 `/uploads` 是公开静态路径，不能承诺私有。因此本轮采用安全简化方案 B：启动流程暂不上传草稿图片，只保存一句话描述。界面提示“图片可在项目建立后补充”。

## Prisma schema 与 Migration

已修改 Prisma schema，新增：

- `ProjectIntakeStatus`
- `ProjectIntake`
- User / Work / CollaborationProject / IncubationProject 的可选关系

已新增独立 migration：

`prisma/migrations/20260730160000_add_project_intake_start_flow/migration.sql`

未执行生产 migration。

## 依赖

未修改依赖，未修改 `package.json` 或 `package-lock.json`。

## 如何避免 N+1

首页继续使用批量查询和 `Promise.all`。`/start` 前三步不请求数据库，最终创建时一次写入。`/me/projects` 一次性查询 Work 项目和当前用户 `ProjectIntake` 列表，不在每条草稿循环查询。

## 新增测试结果

全部通过：

- `scripts/home-positioning-tests.ts`
- `scripts/start-project-flow-tests.ts`
- `scripts/start-project-permission-tests.ts`
- `scripts/start-project-draft-tests.ts`
- `scripts/start-project-mobile-ui-tests.ts`
- `scripts/start-project-schema-tests.ts`
- `scripts/start-project-migration-tests.ts`

## 回归测试结果

现有回归脚本列表全部通过。当前代码副本中实际存在并执行了 33 项脚本清单中的所有脚本。

## TypeScript 和 Build

通过：

- `npx prisma format`
- `npx prisma validate`
- `npx prisma generate`
- `npx tsc --noEmit`
- `npm run build`

`prisma validate` 在当前副本中使用一次性本地占位 `DATABASE_URL`，未写入 `.env`，未连接生产数据库。

## 下一批建议

- 为 ProjectIntake 增加后台评估列表。
- 实现第一项渐进式资料表单：项目定位。
- 如需要图片强私有，再新增鉴权文件路由或私有对象存储，不复用公开 `/uploads` 作为私有存储。
- 后台评估通过后再绑定或转换到现有 `Work` / `CollaborationProject` / `IncubationProject`。
