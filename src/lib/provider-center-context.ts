import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnyProviderForUser, getProviderApplicationForUser } from "@/lib/provider-access";

export async function getProviderCenterContext(next = "/provider-center") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  const [provider, application] = await Promise.all([
    getAnyProviderForUser(user),
    getProviderApplicationForUser(user)
  ]);

  return { user, provider, application };
}
