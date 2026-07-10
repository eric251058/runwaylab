"use client";

import { FormEvent, useState } from "react";
import { CONTRIBUTION_PERSONA_OPTIONS, CONTRIBUTION_TYPE_OPTIONS, WORK_VOTE_OPTIONS } from "@/lib/user-contributions";

type WorkContributionPanelProps = {
  workId: string;
  hasContributionSignals: boolean;
};

async function postJson(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? "提交失败，请稍后再试。");
  }

  return data as { message?: string };
}

export function WorkContributionPanel({ workId, hasContributionSignals }: WorkContributionPanelProps) {
  const [voteMessage, setVoteMessage] = useState("");
  const [voteError, setVoteError] = useState("");
  const [voteBusy, setVoteBusy] = useState("");
  const [contributionMessage, setContributionMessage] = useState("");
  const [contributionError, setContributionError] = useState("");
  const [contributionBusy, setContributionBusy] = useState(false);

  const submitVote = async (type: string) => {
    setVoteBusy(type);
    setVoteMessage("");
    setVoteError("");

    try {
      const data = await postJson(`/api/works/${workId}/vote`, { type });
      setVoteMessage(data.message ?? "感谢你的判断，平台会结合更多用户反馈评估该作品的孵化方向。");
    } catch (error) {
      setVoteError(error instanceof Error ? error.message : "提交失败，请稍后再试。");
    } finally {
      setVoteBusy("");
    }
  };

  const submitContribution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setContributionBusy(true);
    setContributionMessage("");
    setContributionError("");

    try {
      const data = await postJson(`/api/works/${workId}/contributions`, {
        persona: formData.get("persona"),
        type: formData.get("type"),
        name: formData.get("name"),
        contact: formData.get("contact"),
        content: formData.get("content")
      });
      setContributionMessage(data.message ?? "感谢你的建议。平台会根据有效反馈推进作品孵化。");
      form.reset();
    } catch (error) {
      setContributionError(error instanceof Error ? error.message : "提交失败，请稍后再试。");
    } finally {
      setContributionBusy(false);
    }
  };

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Co-create</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">你怎么看这个作品？</h2>
          <p className="mt-3 text-sm leading-6 text-ink/58">你的判断会帮助平台判断作品是否适合打样、预售或商业合作。当前投票不会直接公开展示。</p>
          {hasContributionSignals ? <p className="mt-3 rounded-[6px] bg-paper px-3 py-2 text-xs font-semibold text-ink/50">已有用户参与判断</p> : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {WORK_VOTE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={Boolean(voteBusy)}
                onClick={() => submitVote(option.value)}
                className="min-h-11 rounded-full border border-black/10 bg-paper px-3 text-sm font-semibold text-ink transition hover:border-ink/35 hover:bg-white disabled:opacity-50"
              >
                {voteBusy === option.value ? "提交中..." : option.label}
              </button>
            ))}
          </div>
          {voteMessage ? <p className="mt-3 rounded-[6px] bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-800">{voteMessage}</p> : null}
          {voteError ? <p className="mt-3 rounded-[6px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{voteError}</p> : null}
        </div>

        <form onSubmit={submitContribution} className="grid gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-ink">给这个作品一点建议</h2>
            <p className="mt-3 text-sm leading-6 text-ink/58">如果你是老师、服务商、买手或普通用户，可以提交设计、面料、打样、生产或市场建议。建议默认不会公开展示，将由平台运营人员筛选。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="persona" defaultValue="CONSUMER" className="h-11 rounded-[6px] border border-black/10 bg-white px-3 text-sm">
              {CONTRIBUTION_PERSONA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select name="type" defaultValue="DESIGN_ADVICE" className="h-11 rounded-[6px] border border-black/10 bg-white px-3 text-sm">
              {CONTRIBUTION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="name" maxLength={100} placeholder="姓名，可选" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="contact" maxLength={100} placeholder="联系方式，可选" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
          </div>
          <textarea name="content" required maxLength={1000} placeholder="写下你的建议" className="min-h-28 rounded-[6px] border border-black/10 px-3 py-3 text-sm leading-6" />
          <button disabled={contributionBusy} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
            {contributionBusy ? "提交中..." : "提交建议"}
          </button>
          {contributionMessage ? <p className="rounded-[6px] bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-800">{contributionMessage}</p> : null}
          {contributionError ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{contributionError}</p> : null}
        </form>
      </div>
    </section>
  );
}
