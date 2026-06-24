import { Home, Images, PlusCircle, Sparkles, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const mobileNavItems: NavItem[] = [
  { label: "首页", href: "/", icon: Home },
  { label: "作品", href: "/works", icon: Images },
  { label: "投稿", href: "/publish", icon: PlusCircle },
  { label: "孵化", href: "/incubation", icon: Sparkles },
  { label: "我的", href: "/me", icon: User }
];
