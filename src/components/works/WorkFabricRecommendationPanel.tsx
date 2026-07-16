"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SafeImage } from "@/components/media/SafeImage";
import { FABRIC_RECOMMENDATION_STATUS_LABELS, recommendationConditionText } from "@/lib/fabric-recommendation-shared";

export type WorkFabricRecommendationView = {
  id: string;
  status: keyof typeof FABRIC_RECOMMENDATION_STATUS_LABELS;
  reason?: string | null;
  sampleAvailability?: string | null;
  moqText?: string | null;
  responseTime?: string | null;
  createdAt: string;
  fabric: {
    id: string;
    name: string;
    slug?: string | null;
    imageUrl?: string | null;
    composition?: string | null;
    weight?: string | null;
    width?: string | null;
    usage?: string | null;
  };
  provider?: {
    name?: string | null;
    city?: string | null;
  } | null;
};

type WorkFabricRecommendationPanelProps = {
  workId: string;
  recommendations: WorkFabricRecommendationView[];
  canManage?: boolean;
};

function statusClass(status: WorkFabricRecommendationView["status"]) {
  if (status === "INTERESTED" || status === "ACCEPTED") return "bg-ink text-white";
  if (status === "NOT_SUITABLE" || status === "REJECTED") return "bg-zinc-100 text-ink/55";
  if (status === "WITHDRAWN") return "bg-paper text-ink/40";
  return "bg-white text-ink/58";
}

function fabricMeta(item: WorkFabricRecommendationView["fabric"]) {
  return [item.composition, item.weight, item.width].filter(Boolean).join(" · ") || item.usage || "面料参数待补充";
}

async function readMessage(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.message ?? "操作失败，请稍后再试。";
}

export function WorkFabricRecommendationPanel({ workId, recommendations, canManage = false }: WorkFabricRecommendationPanelProps) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateStatus(recommendationId: string, action: "INTERESTED" | "NOT_SUITABLE") {
    setPendingKey(`${recommendationId}:${action}`);
    setMessage("");
    setError("");

    startTransition(async () => {
      const response = await fetch(`/api/works/${workId}/fabric-recommendations/${recommendationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        setError(await readMessage(response));
        setPendingKey("");
        return;
      }

      setMessage(action === "INTERESTED" ? "已标记为感兴趣。" : "已标记为暂不合适。");
      setPendingKey("");
      router.refresh();
    });
  }

  if (!recommendations.length) return null;

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Fabric Recommendations</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">收到的面料推荐</h2>
        </div>
        <p className="text-sm text-ink/45">{recommendations.length} 条</p>
      </div>

      {message ? <p className="mt-4 rounded-[6px] bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-800">{message}</p> : null}
      {error ? <p className="mt-4 rounded-[6px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="mt-5 grid gap-3">
        {recommendations.map((recommendation) => {
          const pending = isPending && pendingKey.startsWith(recommendation.id);
          const canUpdate = canManage && recommendation.status === "PENDING";
          const href = `/fabrics/${recommendation.fabric.slug ?? recommendation.fabric.id}`;

          return (
            <article key={recommendation.id} className="rounded-[8px] border border-black/8 bg-paper p-3 md:p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={href} className="shrink-0">
                  <SafeImage
                    src={recommendation.fabric.imageUrl}
                    alt={recommendation.fabric.name}
                    className="aspect-[4/3] w-full rounded-[6px] object-cover sm:w-28"
                    placeholder="暂无图片"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(recommendation.status)}`}>
                      {FABRIC_RECOMMENDATION_STATUS_LABELS[recommendation.status]}
                    </span>
                    {recommendation.provider?.name ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/50">{recommendation.provider.name}</span>
                    ) : null}
                  </div>
                  <Link href={href} className="mt-3 block truncate font-semibold text-ink hover:text-ink/70">
                    {recommendation.fabric.name}
                  </Link>
                  <p className="mt-1 text-sm text-ink/52">{fabricMeta(recommendation.fabric)}</p>
                  {recommendation.reason ? <p className="mt-2 text-sm leading-6 text-ink/58">{recommendation.reason}</p> : null}
                  {recommendationConditionText(recommendation) ? (
                    <p className="mt-2 text-xs font-semibold text-ink/42">{recommendationConditionText(recommendation)}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-ink/35">{recommendation.createdAt}</p>
                </div>
                {canUpdate ? (
                  <div className="grid shrink-0 gap-2 sm:w-28">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => updateStatus(recommendation.id, "INTERESTED")}
                      className="h-10 rounded-full bg-ink px-3 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      感兴趣
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => updateStatus(recommendation.id, "NOT_SUITABLE")}
                      className="h-10 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-ink disabled:opacity-50"
                    >
                      暂不合适
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
