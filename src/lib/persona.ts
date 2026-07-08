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
  DESIGNER: "管理作品、孵化进度、面料推荐、服务商方案和预售验证。",
  FABRIC_SUPPLIER: "查看面料库、服务商入驻和可参与的孵化作品。",
  SAMPLE_STUDIO: "关注可打样作品、打样方案和服务商主页入口。",
  FACTORY: "关注可生产作品、生产方案、MOQ、周期和报价说明。",
  BUYER: "查看热门预售、排行榜、采购意向和买手反馈入口。",
  CONSUMER: "查看点赞收藏、预售意向、推荐作品和热门榜单。",
  TEACHER: "查看老师主页、推荐作品、课程作品展和挑战赛。",
  SCHOOL: "查看学校主页、老师列表、课程作品展、挑战赛和学校作品。",
  OTHER: "浏览作品、查看排行榜、预售验证和服务商申请入口。"
};

export const USER_PERSONA_OPTIONS: Array<{ value: UserPersona; label: string; description: string }> = Object.values(UserPersona).map((value) => ({
  value,
  label: USER_PERSONA_LABELS[value],
  description: USER_PERSONA_DESCRIPTIONS[value]
}));

export function isUserPersona(value: unknown): value is UserPersona {
  return typeof value === "string" && Object.values(UserPersona).includes(value as UserPersona);
}
