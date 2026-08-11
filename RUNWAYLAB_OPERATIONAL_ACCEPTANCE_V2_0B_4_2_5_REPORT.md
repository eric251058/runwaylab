# RunwayLab V2.0B.4.2.5 P1-03 实施报告

正式参考基线：`3922425ee264cff209ea7db4f0c2cf3019255101`

本轮范围：仅修复 P1-03。P1-01、P1-02 未重做、未回滚。

## P1-03 状态

代码实施完成，等待 Codespaces PostgreSQL 16 + Playwright 实际验收

当前 Windows 环境未执行真实 PostgreSQL 16 + Chromium E2E，因此不声明 Playwright E2E 已通过。

## 本轮修改

- `package.json`：确认 `@playwright/test` 位于 `devDependencies`，不在 `dependencies`。
- `package-lock.json`：同步 Playwright 顶层 dev 依赖。
- `playwright.config.mjs`：固定 `baseURL = "http://127.0.0.1:3100"`，缺少 `RUNWAYLAB_E2E` 或 `DATABASE_URL` 时直接失败，不使用 `test.skip`。
- `e2e/operational-acceptance.spec.mjs`：替换占位 E2E，新增真实浏览器登录、业务 API 流程、页面断言和 Prisma 数据库断言。
- `scripts/operational-acceptance-e2e-coverage-tests.ts`：改为检查真实 P1-03 覆盖点，不再只检查 spec 文件存在。
- `RUNWAYLAB_OPERATIONAL_ACCEPTANCE_V2_0B_4_2_5_REPORT.md`：更新为当前实施状态和 Codespaces 验收步骤。

## E2E 覆盖

新增的 Playwright spec 使用专用账号：

- owner：`e2e-owner@runwaylab.test`
- admin：`e2e-admin@runwaylab.test`
- outsider：`e2e-outsider@runwaylab.test`

覆盖内容：

1. 未登录访问私人项目被重定向到登录且不泄露项目标题。
2. owner 真实浏览器登录。
3. owner 从 `/start` 浏览器上下文创建真实 `ProjectIntake`。
4. owner 完善资料并提交平台评估。
5. Prisma 断言 `ProjectIntake.status = SUBMITTED`、`completion = 100`。
6. admin 真实浏览器登录。
7. admin 真实 `ACCEPTED`。
8. admin 转化为 `CollaborationProject`。
9. Prisma 断言 `visibility = PRIVATE`、`linkedCollaborationProjectId`、`PROJECT_CREATED` event。
10. owner 访问 `/me/projects`，断言转化后只出现一个私有项目卡片。
11. admin 创建 `USER + ACTIVE` action。
12. owner 提交完成结果，Prisma 断言 `WAITING_PLATFORM_CONFIRMATION`。
13. admin 默认 `/admin/projects` 和等待平台确认筛选可见该项目。
14. admin 确认 USER action。
15. admin 创建 `PLATFORM + ACTIVE` action。
16. 默认待处理和“等待平台行动”筛选可见该项目。
17. `USER + ACTIVE` 不进入默认待处理，但进入“等待用户行动”。
18. admin 完成 PLATFORM action 后进入待安排下一步。
19. CANCELLED 后进入待重新安排并保留历史。
20. outsider 无法读取 owner 私人项目、无法提交 owner action、无法访问 admin 项目管理。
21. 并发创建两个 current action 后只保留一个未结束 action。
22. Prisma 断言 `ACTION_CREATED` event 不重复、`Notification` 不重复。

## 数据库防误连保护

E2E seed / cleanup 只有同时满足以下条件才会执行：

- `RUNWAYLAB_E2E=1`
- `DATABASE_URL` 存在
- `DATABASE_URL` 是 PostgreSQL URL
- 数据库名显式包含隔离测试语义，例如 `runwaylab_e2e`、`runwaylab_test`、`*_e2e`、`*_test`
- URL 不包含生产或云生产迹象，例如 `prod`、`production`、`supabase`、`neon`、`rds`、`amazonaws`、`aliyun`、`railway`、`render`、`vercel`、`sslmode=require`

不满足条件时测试直接失败，不跳过。

## 本地验证

已通过：

- `npm.cmd ls @playwright/test --depth=0`
- `node --check e2e/operational-acceptance.spec.mjs`
- `npx.cmd tsx scripts/operational-acceptance-e2e-coverage-tests.ts`
- 全部 `scripts/*-tests.ts`，共 74 个，通过
- `npx.cmd tsc --noEmit --pretty false`
- `npm.cmd run build`
- `DATABASE_URL=postgresql://runwaylab:runwaylab@127.0.0.1:5432/runwaylab_e2e npx.cmd prisma validate`
- `RUNWAYLAB_E2E=1 DATABASE_URL=postgresql://runwaylab:runwaylab@127.0.0.1:5432/runwaylab_e2e RUNWAYLAB_E2E_SKIP_SERVER=1 npx.cmd playwright test --list`，发现 9 个 Playwright 测试

未执行：

- PostgreSQL 16 Docker 实库迁移
- Chromium 真实 Playwright E2E

## Schema 和 Migration

本轮未修改：

- `prisma/schema.prisma`
- `prisma/migrations/**`

本轮未新增 migration。

## Codespaces 执行方法

```bash
docker run --name runwaylab-e2e-postgres \
  -e POSTGRES_USER=runwaylab \
  -e POSTGRES_PASSWORD=runwaylab \
  -e POSTGRES_DB=runwaylab_e2e \
  -p 5432:5432 \
  -d postgres:16

export DATABASE_URL="postgresql://runwaylab:runwaylab@127.0.0.1:5432/runwaylab_e2e"
export RUNWAYLAB_E2E=1

npm ci
npx prisma migrate deploy
npx playwright install chromium

npm run build
```

构建完成后执行：

```bash
export DATABASE_URL="postgresql://runwaylab:runwaylab@127.0.0.1:5432/runwaylab_e2e"
export RUNWAYLAB_E2E=1

npx playwright test e2e/operational-acceptance.spec.mjs --project=chromium
```

Playwright `webServer` 会复制 `.next/static` 和 `public` 到 `.next/standalone` runtime，并使用 `PORT=3100`、`HOSTNAME=127.0.0.1` 启动 `.next/standalone/server.js`；外层 audit 已执行 `npm run build`，webServer 不再重复构建。

E2E 的 seed 在 `beforeAll` 自动执行，cleanup 在 `afterAll` 自动执行。若中途异常，可重新运行同一命令，下一次 `beforeAll` 会先清理同一批专用测试账号和以 `RunwayLab E2E P1-03` 开头的测试数据。

## 候选包

重新生成：`runwaylab-operational-acceptance-v2.0b.4.2.5.zip`

该 ZIP 只应包含相对正式基线的本轮 P1-03 候选文件和已经完成的 P1-01/P1-02 相关项目文件；不包含 `.env`、`.git`、`node_modules`、`.next`、`playwright-report`、`test-results`、浏览器二进制、trace、截图、video、数据库数据、dump、日志、旧 ZIP、bundle、sha256、`public/uploads` 或生产密钥。
