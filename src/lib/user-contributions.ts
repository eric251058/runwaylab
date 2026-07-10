export const WORK_VOTE_LABELS: Record<string, string> = {
  WANT_BUY: "想买",
  SUITABLE_SAMPLE: "适合打样",
  SUITABLE_PRODUCTION: "适合量产",
  SUITABLE_RUNWAY: "适合秀场",
  CONFUSING: "看不懂"
};

export const CONTRIBUTION_PERSONA_LABELS: Record<string, string> = {
  CONSUMER: "普通用户",
  STUDENT: "设计学生",
  TEACHER: "老师",
  PROVIDER: "服务商",
  BUYER: "买手 / 采购商",
  OTHER: "其他"
};

export const CONTRIBUTION_TYPE_LABELS: Record<string, string> = {
  DESIGN_ADVICE: "设计建议",
  FABRIC_ADVICE: "面料建议",
  SAMPLE_ADVICE: "打样建议",
  PRODUCTION_ADVICE: "生产建议",
  MARKET_ADVICE: "市场建议",
  BUYER_INTEREST: "采购兴趣",
  OTHER: "其他"
};

export const CONTRIBUTION_STATUS_LABELS: Record<string, string> = {
  NEW: "待处理",
  VALUABLE: "有价值",
  REVIEWED: "已查看",
  PROCESSED: "已处理",
  IGNORED: "已忽略"
};

export const WORK_VOTE_OPTIONS = [
  { value: "WANT_BUY", label: "想买" },
  { value: "SUITABLE_SAMPLE", label: "适合打样" },
  { value: "SUITABLE_PRODUCTION", label: "适合量产" },
  { value: "SUITABLE_RUNWAY", label: "适合秀场" },
  { value: "CONFUSING", label: "看不懂" }
] as const;

export const CONTRIBUTION_PERSONA_OPTIONS = [
  { value: "CONSUMER", label: "普通用户" },
  { value: "STUDENT", label: "设计学生" },
  { value: "TEACHER", label: "老师" },
  { value: "PROVIDER", label: "服务商" },
  { value: "BUYER", label: "买手 / 采购商" },
  { value: "OTHER", label: "其他" }
] as const;

export const CONTRIBUTION_TYPE_OPTIONS = [
  { value: "DESIGN_ADVICE", label: "设计建议" },
  { value: "FABRIC_ADVICE", label: "面料建议" },
  { value: "SAMPLE_ADVICE", label: "打样建议" },
  { value: "PRODUCTION_ADVICE", label: "生产建议" },
  { value: "MARKET_ADVICE", label: "市场建议" },
  { value: "BUYER_INTEREST", label: "采购兴趣" },
  { value: "OTHER", label: "其他" }
] as const;

export const CONTRIBUTION_STATUS_OPTIONS = [
  { value: "NEW", label: "待处理" },
  { value: "VALUABLE", label: "有价值" },
  { value: "REVIEWED", label: "已查看" },
  { value: "PROCESSED", label: "已处理" },
  { value: "IGNORED", label: "已忽略" }
] as const;
