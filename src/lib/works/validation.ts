import { z } from "zod";
import { normalizeImageUrl } from "@/components/works/work-visuals";
import { MAX_WORK_IMAGES, MIN_WORK_IMAGES, categoryOptions, styleTagOptions, workTypeOptions } from "@/lib/works/form-options";

const imageSchema = z.object({
  imageUrl: z.string().min(1),
  key: z.string().optional(),
  filename: z.string().optional(),
  size: z.number().optional(),
  mimeType: z.string().optional()
}).transform((image) => ({
  ...image,
  imageUrl: normalizeImageUrl(image.imageUrl)
})).superRefine((image, context) => {
  if (!image.imageUrl) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Image URL is required."
    });
  }

  if (image.imageUrl.startsWith("blob:")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Blob preview URLs cannot be saved."
    });
  }
});

export const workPayloadSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(2000),
  category: z.enum(categoryOptions),
  workType: z.enum(workTypeOptions),
  styleTags: z.array(z.enum(styleTagOptions)).min(1).max(5),
  isAiAssisted: z.boolean().default(false),
  isOriginal: z.literal(true),
  participateChallenge: z.boolean().default(false),
  isOpenCoop: z.boolean().default(false),
  wantsFabric: z.boolean().default(false),
  wantsSample: z.boolean().default(false),
  acceptsCopyright: z.boolean().default(false),
  acceptsBrandCollab: z.boolean().default(false),
  wantsIncubation: z.boolean().default(false),
  images: z.array(imageSchema).min(MIN_WORK_IMAGES).max(MAX_WORK_IMAGES)
});

export const workPatchSchema = workPayloadSchema.partial().extend({
  isOriginal: z.boolean().optional(),
  images: z.array(imageSchema).min(MIN_WORK_IMAGES).max(MAX_WORK_IMAGES).optional()
});
