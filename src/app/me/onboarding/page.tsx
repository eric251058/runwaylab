import Link from "next/link";
import { redirect } from "next/navigation";
import { PersonaOnboardingForm } from "@/app/me/onboarding/PersonaOnboardingForm";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_PERSONA_OPTIONS } from "@/lib/persona";

export const dynamic = "force-dynamic";

export default async function MeOnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/me/onboarding");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Persona</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">选择你的身份</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58 md:text-base">
          RunwayLab 会根据你的身份展示更合适的工作台，你之后也可以修改。
        </p>
      </header>

      <PersonaOnboardingForm options={USER_PERSONA_OPTIONS} currentPersona={user.persona} />

      <div className="mt-6">
        <Link href="/me" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">
          返回我的页面
        </Link>
      </div>
    </div>
  );
}
