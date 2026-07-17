"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type ProfileForm = {
  nickname: string;
  phone: string;
  maskedPhone: string;
  email: string;
  maskedEmail: string;
  persona: string;
  isProvider: boolean;
  school: string;
  city: string;
  styleTags: string;
  bio: string;
};

const emptyProfile: ProfileForm = {
  nickname: "",
  phone: "",
  maskedPhone: "未填写",
  email: "",
  maskedEmail: "未填写",
  persona: "CONSUMER",
  isProvider: false,
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
        setError(data?.message ?? "账号资料暂时无法读取，请稍后再试。");
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
    setProfile((current) => ({ ...current, [field]: value }));
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    const data = (await response.json().catch(() => null)) as { profile?: ProfileForm; message?: string } | null;

    setSaving(false);

    if (!response.ok) {
      setError(data?.message ?? "保存失败，请检查后重试。");
      return;
    }

    if (data?.profile) setProfile(data.profile);
    setMessage(profile.isProvider ? "账号与登录信息已保存。" : "个人资料已保存。");
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-ink md:px-8 md:py-12">
      <Link href={profile.isProvider ? "/provider-center" : "/me"} className="text-sm font-semibold text-ink/50 hover:text-ink">
        {profile.isProvider ? "返回服务商中心" : "返回我的页面"}
      </Link>

      <header className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Account</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">{profile.isProvider ? "账号与登录" : "编辑账号与个人资料"}</h1>
        <p className="mt-4 text-sm leading-6 text-ink/58">
          {profile.isProvider ? "管理登录方式和基本账号信息。" : "公开资料会展示在个人主页；手机号仅用于账号联系，不公开展示。"}
        </p>
      </header>

      <form onSubmit={submit} className="mt-7 space-y-4 rounded-[8px] bg-white p-4 shadow-[0_18px_54px_rgba(16,16,16,0.08)] md:p-6">
        {loading ? <p className="py-10 text-center text-sm font-semibold text-ink/45">正在读取资料...</p> : null}

        {!loading ? (
          <>
            <label className="block">
              <span className="text-xs font-semibold text-ink/50">昵称或账号名称</span>
              <input
                value={profile.nickname}
                onChange={(event) => updateField("nickname", event.target.value)}
                maxLength={24}
                required
                className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-base outline-none transition focus:border-ink focus:bg-white"
                placeholder="请输入昵称"
              />
            </label>

            <section className="rounded-[8px] bg-paper p-4">
              <h2 className="text-sm font-semibold text-ink">登录方式</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-[6px] bg-white p-3">
                  <p className="text-xs font-semibold text-ink/40">邮箱</p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">{profile.maskedEmail}</p>
                </div>
                <div className="rounded-[6px] bg-white p-3">
                  <p className="text-xs font-semibold text-ink/40">当前手机号</p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">{profile.maskedPhone}</p>
                </div>
              </div>
            </section>

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">更新手机号（可选）</span>
              <input
                value={profile.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                maxLength={32}
                type="tel"
                autoComplete="tel"
                className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-base outline-none transition focus:border-ink focus:bg-white"
                placeholder="留空则不绑定手机号"
              />
              <span className="mt-2 block text-xs leading-5 text-ink/45">支持 13800138000、86 13800138000 或以 + 开头的国际手机号。</span>
            </label>

            {profile.isProvider ? (
              <section className="rounded-[8px] border border-black/8 p-4">
                <h2 className="text-sm font-semibold text-ink">登录安全</h2>
                <p className="mt-2 text-sm leading-6 text-ink/55">密码修改和账号安全策略沿用现有登录系统。本页不会展示完整手机号、邮箱或任何密钥。</p>
                <button type="button" onClick={logout} className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                  退出登录
                </button>
              </section>
            ) : (
              <>
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
              </>
            )}

            {error ? <p className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            {message ? <p className="rounded-[6px] border border-black/10 bg-paper px-4 py-3 text-sm font-semibold text-ink/70">{message}</p> : null}

            <button
              type="submit"
              disabled={saving}
              className="h-12 w-full rounded-full bg-ink text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "保存中..." : profile.isProvider ? "保存账号信息" : "保存个人资料"}
            </button>
          </>
        ) : null}
      </form>
    </main>
  );
}
