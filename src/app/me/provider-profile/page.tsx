import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function MeProviderProfilePage() {
  redirect("/provider-center/profile");
}
