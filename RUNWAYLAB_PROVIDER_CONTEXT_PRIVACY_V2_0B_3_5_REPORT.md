# RunwayLab V2.0B.3.5 实施报告

版本：服务商角色上下文、联系方式隐私与核心按钮热修复
本地状态：当前目录不是 Git 仓库，无法直接确认本地 commit；按用户声明的生产基线 `9a688a2` 开发。
执行范围：第一批无 Migration 热修复。未 commit、未 push、未部署、未操作生产数据库。

## 修改文件

新增：

- `src/lib/account-display.ts`
- `scripts/provider-public-context-tests.ts`
- `scripts/provider-contact-privacy-tests.ts`
- `scripts/provider-showcase-context-tests.ts`
- `scripts/auth-nav-account-menu-tests.ts`
- `RUNWAYLAB_PROVIDER_CONTEXT_PRIVACY_V2_0B_3_5_REPORT.md`

修改：

- `src/app/providers/[id]/page.tsx`
- `src/app/providers/[id]/showcase/[itemId]/page.tsx`
- `src/components/providers/ProviderInquiryForm.tsx`
- `src/components/layout/AuthNav.tsx`
- `src/app/api/auth/me/route.ts`
- `src/app/api/cooperation-requests/route.ts`
- `src/lib/supply-network.ts`
- `src/lib/provider-access.ts`
- `src/app/provider-center/profile/page.tsx`
- `src/app/admin/providers/page.tsx`

## Owner / Visitor / Admin 最终行为

### `/providers/[id]`

- 服务商 owner 默认看到 owner 控制区。
- owner 主按钮为“编辑服务商主页”。
- owner 辅助入口包括“管理面料产品”“管理案例”“查看收到的询盘”“查看发出的推荐”。
- owner 不再看到 `ProviderInquiryForm`，不再看到“发送询盘”访客操作。
- owner 可以通过 `?preview=visitor` 预览访客视角。
- 预览模式会显示“正在预览访客视角”和“退出预览”。
- 预览模式不改变真实权限，表单提交会提示“预览模式下不能向自己发送询盘。”。
- 普通访客只看到一个站内联系模块。
- 未登录访客通过“登录后联系服务商”携带 next 返回当前服务商页面。
- 管理员不再自动成为 provider owner，公开页默认是访客视角，只显示“后台管理此服务商”入口。

### `/providers/[id]/showcase/[itemId]`

- 服务商 owner 看到“编辑案例”“返回案例管理”“查看收到的询盘”“查看服务商主页”。
- 服务商 owner 不再看到联系自己或发送询盘表单。
- 普通访客使用唯一站内联系入口。
- 管理员不自动进入 owner 模式，只看到后台管理入口。

## 联系方式隐私规则

- 公开服务商页不再渲染完整 `contactEmail`、`contactPhone`、`wechat`、`whatsapp`。
- 不使用 CSS 或客户端 JS 隐藏完整联系方式。
- `publicContactEnabled` 在代码层解释为“允许登录用户发起站内联系”。
- 若服务商未开启站内联系，公开页显示简洁提示，不展示表单。
- `POST /api/cooperation-requests` 保留自询盘 403，并新增对 `publicContactEnabled` 的后端检查。
- 服务商完整联系方式仍可在 `/provider-center/profile` 查看和编辑。
- 管理员完整联系方式仍可在 `/admin/providers` 查看。
- 询盘双方继续沿用现有授权规则查看联系方式。

## AuthNav 显示名称规则

新增 `src/lib/account-display.ts`：

- 服务商账号优先显示绑定 `Provider.name`。
- 非服务商优先显示 `User.nickname`。
- nickname 如果看起来是手机号或邮箱，会先脱敏。
- fallback 使用脱敏邮箱或脱敏手机号。
- 不显示完整手机号、完整邮箱、User ID 或 Provider ID。
- `/api/auth/me` 新增 `displayName`、`providerName`、`maskedAccount`，不返回完整 phone 字段。

## 退出登录状态

- 桌面菜单、服务商菜单、移动端退出按钮常态不再使用低透明度 disabled-like 样式。
- 点击退出后显示“退出中…”，并禁止重复点击。
- 退出成功跳转 `/login` 并刷新。
- 退出失败会恢复按钮并显示“退出失败，请稍后再试。”。
- 未使用浏览器原生 alert。

## 是否修改 Schema / Migration

- 是否修改 Prisma schema：否。
- 是否新增 migration：否。
- `npx prisma format` 执行后 schema 哈希前后一致。

## 测试结果

新增测试：

- `npx tsx scripts/provider-public-context-tests.ts`：通过
- `npx tsx scripts/provider-contact-privacy-tests.ts`：通过
- `npx tsx scripts/provider-showcase-context-tests.ts`：通过
- `npx tsx scripts/auth-nav-account-menu-tests.ts`：通过

现有回归：

- `npx tsx scripts/provider-onboarding-tests.ts`：通过
- `npx tsx scripts/provider-inquiry-tests.ts`：通过
- `npx tsx scripts/provider-recommendation-tests.ts`：通过
- `npx tsx scripts/provider-permission-tests.ts`：通过
- `npx tsx scripts/identity-v234-tests.ts`：通过
- `npx tsx scripts/phone-utils-tests.ts`：通过
- `npx tsx scripts/security-smoke-tests.ts`：通过
- `npx tsx scripts/demand-v21-tests.ts`：通过
- `npx tsx scripts/project-marketplace-v22-tests.ts`：通过
- `npx tsx scripts/limited-preorder-v23-tests.ts`：通过
- `npx tsx scripts/feature-flags-tests.ts`：通过
- `npx tsx scripts/public-work-quality-tests.ts`：通过

构建验证：

- `npx prisma format`：通过，schema 未变化
- `npx prisma validate`：通过。因本地未配置真实 `DATABASE_URL`，使用临时占位环境变量执行，仅用于 schema 校验，未写入 `.env`
- `npx prisma generate`：通过
- `npx tsc --noEmit`：通过
- `npm run build`：通过
- `git diff --check`：未执行成功，原因是当前目录不是 Git 仓库

## 未处理事项

按本轮限制，以下内容未处理：

- Work 删除与归档 Migration
- 全站所有删除按钮
- Provider 重复数据合并
- Provider canonicalProviderId
- ProviderSlugAlias
- 服务商方案状态闭环
- 长表单草稿统一
- 询盘完整归档生命周期
- 全站按钮系统重构
- Demand V2.1 / Project Marketplace V2.2 / Limited Preorder V2.3 开启或功能扩展
