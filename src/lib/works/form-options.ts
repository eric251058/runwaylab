export const workTypeOptions = ["手绘稿", "效果图", "AI辅助设计", "成衣照片", "毕业设计", "系列设计", "旧衣改造", "面料实验"] as const;

export const categoryOptions = ["女装", "男装", "礼服", "外套", "衬衫", "裤装", "运动装", "童装", "实验设计"] as const;

export const styleTagOptions = ["极简", "复古", "街头", "国风", "可持续", "未来感", "通勤", "机能", "高级感", "浪漫"] as const;

export type UploadedWorkImage = {
  imageUrl: string;
  key: string;
  filename: string;
  size: number;
  mimeType: string;
};

export const MIN_WORK_IMAGES = 3;
export const MAX_WORK_IMAGES = 9;
