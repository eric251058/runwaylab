# RunwayLab V2.1 Workspace Privacy Hardening

日期：2026-08-14
基线：`develop/v2.1-open-launch-loop` commit `5a0671079b86750540b18d508766d911687c0d50`

## 结论

开放工作空间的创建、邀请和成员管理已经形成基础，但原实现尚未把新增加的作品可见性完整接入公共查询与详情权限。公开或不列出的空间详情也可能显示成员邮箱、非公开作品标题和非公开项目，因此不满足部署条件。

本轮先完成隐私与并发安全加固，不新增产品功能，不接真实支付，不部署生产。

## 修复范围

- 所有公共作品查询只允许 `WorkVisibility.PUBLIC`。
- 公开质量判断同时校验审核状态、内容状态与作品可见性。
- 非公开作品详情按作者、活跃空间成员、空间管理员和平台管理员授权。
- 私密空间在读取成员、作品和项目之前完成访问校验。
- 非成员只能看到审核通过且公开的作品，以及符合既有公开规则的项目。
- 成员邮箱只向空间活跃成员或平台管理员呈现。
- 成员数量只统计活跃成员。
- 邀请接受使用条件更新，避免同一邀请被并发重复处理。
- 所有权转移使用条件更新，避免并发产生多个 OWNER。
- 角色调整、移除成员和主动退出均防止与所有权变化发生竞态。

## 保留边界

- 作品加入空间、项目加入空间仍未开放用户操作入口。
- 真实支付、退款、结算仍未启用。
- 本轮不修改既有 migration，不部署生产数据库。

## 验收

- `scripts/workspace-permission-tests.ts`
- `scripts/workspace-privacy-contract-tests.ts`
- `scripts/public-work-quality-tests.ts`
- Prisma validate / generate
- TypeScript noEmit
- Next.js production build

只有上述验收全部通过后，才允许继续实现“把我的作品加入空间”。
