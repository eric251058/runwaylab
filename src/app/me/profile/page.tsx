"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type ProfileForm = {
  nickname: string;
  school: string;
  city: string;
  styleTags: string;
  bio: string;
};

const emptyProfile: ProfileForm = {
  nickname: "",
  school: "",
  city: "",
  styleTags: "",
  bio: ""
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const response = await fetch("/api/me/profile", { cache: "no-store" });

      if (response.status === 401) {
        router.replace("/login?next=/me/profile");
        return;
      }

      const data = (await response.json().catch(() => null)) as { profile?: ProfileForm; message?: string } | null;

      if (!active) return;

      if (!response.ok || !data?.profile) {
        setError(data?.message ?? "个人资料暂时无法读取，请稍后再试。");
      } else {
        setProfile(data.profile);
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  function updateField(field: keyof ProfileForm, value: string) {
    setProfile((current) => ({
      ...current,
      [field]: value
    }));
    setMessage("");
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(profile)
    });
    const data = (await response.json().catch(() => null)) as { profile?: ProfileForm; message?: string } | null;

    setSaving(false);

    if (!response.ok) {
      setError(data?.message ?? "保存失败，请检查后重试。");
      return;
    }

    if (data?.profile) {
      setProfile(data.profile);
    }
    setMessage("个人资料已保存。");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-ink md:px-8 md:py-12">
      <Link href="/me" className="text-sm font-semibold text-ink/50 hover:text-ink">
        返回我的页面
      </Link>

      <header className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Designer Profile</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">编辑个人资料</h1>
        <p className="mt-4 text-sm leading-6 text-ink/58">这些信息会展示在你的设计师主页，帮助别人理解你的学校、城市、风格和创作方向。</p>
      </header>

      <form onSubmit={submit} className="mt-7 space-y-4 rounded-[8px] bg-white p-4 shadow-[0_18px_54px_rgba(16,16,16,0.08)] md:p-6">
        {loading ? <p className="py-10 text-center text-sm font-semibold text-ink/45">正在读取资料...</p> : null}

        {!loading ? (
          <>
            <label className="block">
              <span className="text-xs font-semibold text-ink/50">昵称</span>
              <input
                value={profile.nickname}
                onChange={(event) => updateField("nickname", event.target.value)}
                maxLength={24}
                required
                className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-base outline-none transition focus:border-ink focus:bg-white"
                placeholder="请输入昵称"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-ink/50">学校</span>
                <input
                  value={profile.school}
                  onChange={(event) => updateField("school", event.target.value)}
                  maxLength={60}
                  className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-base outline-none transition focus:border-ink focus:bg-white"
                  placeholder="例如：东华大学"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-ink/50">城市</span>
                <input
                  value={profile.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  maxLength={40}
                  className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-base outline-none transition focus:border-ink focus:bg-white"
                  placeholder="例如：上海"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">设计风格标签</span>
              <input
                value={profile.styleTags}
                onChange={(event) => updateField("styleTags", event.target.value)}
                maxLength={120}
                className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-base outline-none transition focus:border-ink focus:bg-white"
                placeholder="女装, 极简, 国风, 通勤"
              />
            </label>

            <label className="block">
              <span className="flex items-center justify-between text-xs font-semibold text-ink/50">
                <span>个人简介</span>
                <span>{profile.bio.length}/200</span>
              </span>
              <textarea
                value={profile.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                maxLength={200}
                rows={5}
                className="mt-2 w-full resize-none rounded-[6px] border border-black/10 bg-paper px-4 py-3 text-base leading-6 outline-none transition focus:border-ink focus:bg-white"
                placeholder="简单介绍你的设计方向、关注议题或正在创作的系列。"
              />
            </label>

            {error ? <p className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            {message ? <p className="rounded-[6px] border border-black/10 bg-paper px-4 py-3 text-sm font-semibold text-ink/70">{message}</p> : null}

            <button
              type="submit"
              disabled={saving}
              className="h-12 w-full rounded-full bg-ink text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存个人资料"}
            </button>
          </>
        ) : null}
      </form>
    </main>
  );
}
