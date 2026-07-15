import { Home, Images, PlusCircle, Store, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const mobileNavItems: NavItem[] = [
  { label: "首页", href: "/", icon: Home },
  { label: "作品", href: "/works", icon: Images },
  { label: "发布", href: "/publish", icon: PlusCircle },
  { label: "资源", href: "/providers", icon: Store },
  { label: "我的", href: "/me", icon: User }
];
