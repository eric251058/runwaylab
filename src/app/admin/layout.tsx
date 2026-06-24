import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdminUser();

  if (!user) {
    redirect("/login");
  }

  return children;
}
