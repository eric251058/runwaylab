# RunwayLab V2.0B.4.1.1 Home Feed, Share, Comment Report

## 基线

- 当前基线 commit：`ba417b477d28675b4573ea82715f3dcaa5354f53`
- 本轮属于 UI、分享和互动体验修复。

## 审计结论

- 当前分享按钮实际传递：作品卡片分享使用 `navigator.share({ title, text: "在 RunwayLab 发现这个设计作品", url })`，详情页分享只复制 `window.location.href`。
- 当前作品详情页此前没有 `generateMetadata`，外部平台优先读取全站 `layout.tsx` 的 RunwayLab metadata。
- 当前 OG 图片此前是全站级信息，不是作品专属 1200x630 分享图。
- 当前首页每张作品卡没有单独查询评论；首页也没有批量评论预览，因此缺少评论氛围。
- 当前首页精选卡使用统一卡片网格，图片被统一裁切，发现浏览与深度互动两个目标混在同一张卡里。
- 当前详情操作栏是偏方格工具栏的结构，本轮改为轻量操作区并接入自定义分享面板。

## 动态 Metadata

- `src/app/works/[id]/page.tsx` 新增 `generateMetadata`。
- 公开作品 metadata 标题为 `{作品标题}｜{设计师名称}｜RunwayLab`。
- description 使用作品说明、设计师公开名称和公开学校生成安全摘要。
- canonical 指向 `https://fashionstyleai.com/works/{workId}`。
- 非公开、下架、拒绝、审核中或不存在作品返回安全 metadata，并 `noindex`。
- metadata 查询失败不会导致页面 500。

## 作品专属 OG 图片

- 新增 `src/app/works/[id]/opengraph-image.tsx`。
- 使用 `ImageResponse` 生成 1200x630 图片。
- 包含作品封面、作品标题、设计师公开名称、公开学校、RunwayLab 标识和“让好设计走向现实”。
- 图片 URL 使用安全校验，失败时显示安全占位。
- 不展示评论内容，不伪造获奖或官方认证。

## 分享与小红书分享图

- 新增 `WorkSharePanel`，面板标题为“分享这个设计”。
- 提供四个入口：分享作品、生成小红书分享图、复制分享文案、复制作品链接。
- 系统分享使用当前作品 title、text 和 canonical URL，不分享首页 URL。
- 小红书分享图使用浏览器 Canvas 生成 1080x1440 竖版图，不引入大型图片编辑库。
- 支持 `navigator.canShare({ files })` 时尝试文件分享；否则保存图片并复制文案。
- Web 无法确认用户是否发布到小红书，因此只提示“分享图片已生成，文案已复制。请打开小红书选择图片发布。”。

## 首页双模式

- 首页新增两个模式：灵感、动态。
- 未登录默认灵感；已登录默认动态；也支持 `?view=inspiration` / `?view=activity`。
- 灵感模式使用移动端双列、桌面 3-4 列的作品发现网格。
- 动态模式使用居中单列信息流，卡片最大宽度约 700px。
- 评论正文只在动态模式展示，灵感模式不加载评论正文。

## 评论预览与 N+1

- 动态模式批量查询当前页作品的评论预览。
- 每件作品最多展示两条最新有效评论。
- 评论 DTO 只包含 `id`、`workId`、`content`、`createdAt` 和评论者公开 `nickname`。
- 不包含 email、phone、passwordHash、session、私有 Provider 数据或管理员信息。
- 快速评论复用现有 `/api/works/[id]/comments`，服务端继续重新确认作品公开状态。
- 下架或不存在作品不能继续评论。

## 图片比例与移动端

- 灵感模式主图使用 3:4，不再使用过扁横图。
- 动态模式主图使用 4:5 或 3:4，不拉伸变形。
- 移动端使用 8-12px 级别间距，双列间距较小，避免横向滚动。
- 图片设置 `sizes`，避免移动端加载过大的桌面图片。

## 安全与无障碍

- 分享面板支持 Escape 关闭和焦点循环。
- 分享、点赞、收藏、想买、评论按钮有可读名称和至少 44px 点击区域。
- 评论文本按纯文本渲染，未使用 `dangerouslySetInnerHTML`。
- 分享 URL 拒绝 `javascript:`、`data:` 和协议相对 URL。
- 分享内容移除邮箱、手机号、微信和 WhatsApp。

## 验证

- 五项新增测试：通过
- 26 项现有测试：通过
- `npx prisma format`：通过，未改变 schema 内容
- `npx prisma validate`：通过
- `npx prisma generate`：通过
- `npx tsc --noEmit`：通过
- `npm run build`：通过
- `git diff --check`：通过

## 配置与数据库

- 是否修改 Prisma schema：否
- 是否新增 Migration：否
- 是否修改依赖：否
- 未修改生产数据库
- 未开启 Demand V2.1、Project Marketplace V2.2、Limited Preorder V2.3、真实支付、真实短信或 APP 推送

## 下一批建议

- 后续可加入评论回复线程，但需要 schema 支持稳定回复关系。
- 后续可做评论热度排序，但本轮优先最新两条，避免引入复杂算法。
- 后续可在产品规则明确后接入点赞/收藏聚合通知。
- 后续可对分享图加入真实短链，但不能依赖未经确认的小红书私有 Scheme。
