import { isPublicQualityWork } from "@/lib/works/rules";

type WorkLike = Parameters<typeof isPublicQualityWork>[0];

function makeWork(overrides: Partial<WorkLike> = {}): WorkLike {
  return {
    reviewStatus: "APPROVED",
    contentStatus: "VISIBLE",
    title: "Structured denim jacket",
    description: "A complete student design concept with silhouette, material direction, and styling notes.",
    images: [{ imageUrl: "/uploads/works/look-1.jpg" }],
    ...overrides
  };
}

function assertQuality(label: string, work: WorkLike, expected: boolean) {
  const actual = isPublicQualityWork(work);
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
  console.log(`PASS ${label}`);
}

function main() {
  assertQuality("valid public work", makeWork(), true);
  assertQuality("valid Chinese title", makeWork({ title: "都市通勤风衣" }), true);
  assertQuality("valid English title", makeWork({ title: "Modular evening dress" }), true);
  assertQuality("valid remote cover", makeWork({ images: [{ imageUrl: "https://example.com/work.jpg" }] }), true);
  assertQuality("pending review rejected", makeWork({ reviewStatus: "PENDING" }), false);
  assertQuality("hidden content rejected", makeWork({ contentStatus: "HIDDEN" }), false);
  assertQuality("missing images rejected", makeWork({ images: [] }), false);
  assertQuality("blank cover rejected", makeWork({ images: [{ imageUrl: "   " }] }), false);
  assertQuality("placeholder cover rejected", makeWork({ images: [{ imageUrl: "undefined" }] }), false);
  assertQuality("single character title rejected", makeWork({ title: "A" }), false);
  assertQuality("numeric title rejected", makeWork({ title: "123456" }), false);
  assertQuality("repeated character title rejected", makeWork({ title: "AAAA" }), false);
  assertQuality("test title rejected", makeWork({ title: "test" }), false);
  assertQuality("demo title rejected", makeWork({ title: "demo" }), false);
  assertQuality("Chinese test title rejected", makeWork({ title: "测试" }), false);
  assertQuality("short description rejected", makeWork({ description: "Too short." }), false);
  assertQuality("overlong description rejected", makeWork({ description: "x".repeat(5001) }), false);
}

try {
  main();
} catch (error) {
  console.error("Public work quality tests failed", { errorType: error instanceof Error ? error.name : typeof error });
  process.exit(1);
}
