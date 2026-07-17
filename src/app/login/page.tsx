import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { isFeatureEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const identityEnabled = await isFeatureEnabled("feature.identity_v234");

  return (
    <Suspense
      fallback={
        <main className="flex min-h-[70dvh] items-center justify-center bg-paper px-4 text-ink">
          <div className="text-sm font-semibold text-ink/55">登录表单加载中...</div>
        </main>
      }
    >
      <LoginForm identityEnabled={identityEnabled} />
    </Suspense>
  );
}
