import { UserPersona } from "@prisma/client";

export const USER_PERSONA_LABELS: Record<UserPersona, string> = {
  DESIGNER: "设计师 / 服装设计学生",
  FABRIC_SUPPLIER: "面料商",
  SAMPLE_STUDIO: "制版打样工作室",
  FACTORY: "服装工厂",
  BUYER: "买手 / 采购商",
  CONSUMER: "普通用户",
  TEACHER: "老师",
  SCHOOL: "学校 / 院校方",
  OTHER: "其他身份"
};

export const USER_PERSONA_DESCRIPTIONS: Record<UserPersona, string> = {
  DESIGNER: "发布作品，查看孵化进度、老师推荐、服务商方案和预售验证。",
  FABRIC_SUPPLIER: "维护面料库，参与作品面料匹配和孵化机会。",
  SAMPLE_STUDIO: "发现适合打样的作品，提交打样方案并跟进项目。",
  FACTORY: "参与可生产作品，提交生产方案、MOQ、周期和报价说明。",
  BUYER: "发现新锐作品，提交采购意向和买手反馈。",
  CONSUMER: "浏览、点赞、收藏作品，提交预售或想买意向。",
  TEACHER: "推荐学生作品，参与课程作品展和设计挑战赛。",
  SCHOOL: "展示学校作品、老师、课程作品展和挑战赛。",
  OTHER: "浏览作品、查看榜单和预售，选择适合自己的参与方式。"
};

export const USER_PERSONA_OPTIONS: Array<{ value: UserPersona; label: string; description: string }> = Object.values(UserPersona).map((value) => ({
  value,
  label: USER_PERSONA_LABELS[value],
  description: USER_PERSONA_DESCRIPTIONS[value]
}));

export const FIRST_GOAL_OPTIONS: Array<{ value: UserPersona; label: string; description: string; nextPath: string }> = [
  {
    value: UserPersona.CONSUMER,
    label: "发现并支持原创设计",
    description: "浏览作品、收藏喜欢的设计，并提交不付款的预售或想买意向。",
    nextPath: "/works"
  },
  {
    value: UserPersona.DESIGNER,
    label: "发布我的设计作品",
    description: "上传作品，获得老师推荐、面料匹配、打样方案和孵化机会。",
    nextPath: "/publish"
  },
  {
    value: UserPersona.FABRIC_SUPPLIER,
    label: "提供面料 / 打样 / 生产服务",
    description: "先申请服务商入驻，再参与优秀作品的产业协作。",
    nextPath: "/providers/apply"
  }
];

export function isUserPersona(value: unknown): value is UserPersona {
  return typeof value === "string" && Object.values(UserPersona).includes(value as UserPersona);
}
