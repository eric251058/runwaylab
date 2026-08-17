const sections = [
  {
    title: "一、需求验证（V2.1）",
    paragraphs: [
      "需求验证仅用于收集市场兴趣和需求信号，不生成限量预售订单、不收款，也不承诺生产或交付。",
      "用户提交的尺码、颜色、数量、预算和联系方式，仅用于平台后续沟通、人工核实与判断是否具备进入限量预售的条件。"
    ]
  },
  {
    title: "二、限量预售（V2.3）",
    paragraphs: [
      "只有通过作品质量、设计授权、需求目标、商品资料、SKU 容量、生产条件和平台审核的项目，才可以发起限量预售。",
      "限量预售不等于现货。页面展示的价格、尺码、颜色、活动限量、成团目标、截止时间和预计发货时间，以用户提交时确认的活动及订单快照为准。",
      "提交限量预售订单意向会占用对应商品和 SKU 名额。平台可要求用户在限定时间内完成必要确认；逾期、重复、异常或无法核实的记录可以被取消并释放名额。"
    ]
  },
  {
    title: "三、首期试点与付款边界",
    paragraphs: [
      "RunwayLab 首期限量预售试点采用人工确认订单意向模式，不提供在线付款，不收取定金。平台或任何参与方不得以平台预售名义要求用户向未公示账户转账。",
      "未来如某一活动依法启用付款，必须在提交前单独展示付款方式、退款规则、处理时限和责任主体；未明确展示并经用户确认的，不视为已启用付款活动。"
    ]
  },
  {
    title: "四、成团、失败与取消",
    paragraphs: [
      "在截止时间前达到活动规定的合格订单数量，活动可进入成团及生产确认；达到目标不代表立即发货，仍应以页面公示的预计发货时间和后续生产状态为准。",
      "截止时未达到目标，活动将按规则关闭未确认订单；活动因版权、授权、质量、供应链、风控或不可抗力等原因也可能被暂停或取消。",
      "如未来付款活动发生失败或取消，已收款项必须进入真实退款处理流程。退款完成以实际退款记录为准，平台不会仅通过修改页面状态视为退款完成。"
    ]
  },
  {
    title: "五、信息与责任",
    paragraphs: [
      "用户应提交真实、准确且可联系的信息，不得恶意占用限量名额、重复提交或冒用他人身份。设计师、项目方和平台应保留授权、商品版本、订单状态和关键操作记录。",
      "消费者可在订单中心查看其提交时的商品、SKU、条款版本及活动状态。具体售后责任以活动页面、订单记录及依法签署的补充协议为准。",
      "本页面为平台通用规则说明，不替代针对具体项目的合同，也不构成法律意见；如具体活动条款与本规则不一致，应在不减损消费者法定权利的前提下，以用户明确确认的具体条款为准。"
    ]
  }
] as const;

export default function PresaleRulesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-8 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Legal · Demand & Limited Preorder</p>
      <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">需求验证与限量预售规则</h1>
      <div className="mt-6 rounded-[8px] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
        <strong>重要提示：</strong>预售商品尚未形成现货，存在未成团、生产延期、取消或退款等待等风险。提交前请核对限量、截止时间、成团目标、预计发货时间和当前付款模式。
      </div>
      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-semibold text-ink">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-ink/62">
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-10 text-xs leading-6 text-ink/40">规则版本：V2.3-PILOT-2026-08 · 更新日期：2026-08-17</p>
    </main>
  );
}
