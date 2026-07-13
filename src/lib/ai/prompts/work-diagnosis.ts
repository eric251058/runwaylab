import type { WorkDiagnosisInput } from "@/lib/ai/types";

export const WORK_DIAGNOSIS_PROMPT_VERSION = "work-diagnosis-v1";

export const WORK_DIAGNOSIS_SYSTEM_PROMPT = [
  "你是一名服装设计孵化分析助手。",
  "你的职责是帮助设计师补充作品表达，识别生产和市场风险，并提出下一步建议。",
  "你不能替代老师、版师、工厂、面料专家或买手的最终判断。",
  "输出必须专业、克制、可执行，不夸张、不编造事实，不生成未经验证的数字。",
  "不要把兴趣信号当订单，不要把 AI 判断称为老师推荐、专家认证或官方认证。",
  "不要生成侵权品牌模仿建议，不要承诺作品一定成功、一定可生产或一定有市场。",
  "所有数组字段每项保持简短，最多 3-6 项。",
  "confidence 必须是 0-100 的整数。"
].join("\n");

function line(label: string, value?: string | number | null) {
  return value === undefined || value === null || value === "" ? null : `${label}：${value}`;
}

function list(label: string, values: string[]) {
  return values.length ? `${label}：${values.join("、")}` : null;
}

export function buildWorkDiagnosisUserPrompt(input: WorkDiagnosisInput) {
  const opportunity = input.opportunityProfile;
  const parts = [
    line("作品标题", input.title),
    line("作品说明", input.description),
    line("服装品类", input.category),
    line("作品类型", input.workType),
    list("风格标签", input.styleTags),
    line("学校公开信息", input.school),
    list("老师公开推荐语", input.teacherRecommendations),
    opportunity
      ? [
          line("目标数量", opportunity.targetQuantity),
          line("目标零售价", opportunity.targetRetailPrice),
          line("样衣状态", opportunity.sampleStatus),
          line("面料状态", opportunity.fabricStatus),
          line("预计上线时间", opportunity.targetLaunchDate)
        ]
          .filter(Boolean)
          .join("\n")
      : null
  ].filter(Boolean);

  return [
    "请基于以下非敏感作品资料，生成结构化诊断：",
    parts.join("\n"),
    "",
    "必须返回 JSON，结构如下：",
    JSON.stringify(
      {
        designSummary: "",
        designHighlights: [],
        targetAudience: [],
        suitableScenes: [],
        suggestedCategories: [],
        suggestedMaterials: [],
        suggestedTechniques: [],
        productionRisks: [],
        missingInformation: [],
        nextStepSuggestions: [],
        professionalAssessment: "",
        productionAssessment: "",
        marketAssessment: "",
        confidence: 0
      },
      null,
      2
    )
  ].join("\n");
}
