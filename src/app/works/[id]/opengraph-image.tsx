import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site-config";
import { getPublicWorkShareInfo } from "@/lib/work-share-data";
import { safeWorkImageUrl, truncateShareText } from "@/lib/work-share";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

type OpenGraphImageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkOpenGraphImage({ params }: OpenGraphImageProps) {
  const { id } = await params;
  const work = await getPublicWorkShareInfo(id).catch(() => null);
  const imageUrl = safeWorkImageUrl(work?.imageUrl);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          background: "#f5f2ea",
          color: "#111",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ width: "710px", height: "630px", display: "flex", background: "#ded9ce", overflow: "hidden" }}>
          {work && imageUrl ? (
            <img src={imageUrl} alt={work.title} style={{ width: "710px", height: "630px", objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", width: "710px", height: "630px", alignItems: "center", justifyContent: "center", fontSize: 56, fontWeight: 700 }}>
              {SITE_NAME}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "490px", padding: "54px 56px" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 0 }}>{SITE_NAME}</div>
            <div style={{ marginTop: 14, fontSize: 24, color: "#6b6458" }}>让好设计走向现实</div>
          </div>
          <div>
            <div style={{ fontSize: 54, lineHeight: 1.08, fontWeight: 800 }}>
              {work ? truncateShareText(work.title, 34) : "作品暂不可分享"}
            </div>
            <div style={{ marginTop: 28, fontSize: 28, color: "#443f37" }}>
              {work ? truncateShareText(work.designerName, 24) : "RunwayLab"}
            </div>
            {work?.schoolName ? (
              <div style={{ marginTop: 10, fontSize: 24, color: "#766f64" }}>{truncateShareText(work.schoolName, 28)}</div>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {(work?.styleTags ?? []).slice(0, 3).map((tag) => (
              <span key={tag} style={{ padding: "8px 14px", borderRadius: 999, background: "#111", color: "#fff", fontSize: 20 }}>
                {truncateShareText(tag, 10)}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
