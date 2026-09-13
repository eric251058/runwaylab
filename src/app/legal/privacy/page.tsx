import Link from "next/link";
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-8 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Legal</p>
      <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">隐私政策</h1>
      <div className="mt-8 space-y-5 text-sm leading-7 text-ink/62">
        <p>平台会保存用户提交的账号信息、作品信息、联系方式、预售意向、认证资料和合作需求，用于账号服务、内容展示、审核、撮合和平台秩序维护。</p>
        <p>平台不会在未经授权的情况下公开敏感联系方式。合作推进中，平台可能根据用户提交意向协助双方建立联系。</p>
        <p>用户可以通过<Link href="/support" className="underline">帮助与隐私申请</Link>提交修改、删除资料的请求，并在申请记录中查看回复。提交申请不会自动删除数据。</p>
        <p>本页面为平台规则说明，不构成正式法律意见。正式合作以双方签署协议为准。</p>
      </div>
    </main>
  );
}
