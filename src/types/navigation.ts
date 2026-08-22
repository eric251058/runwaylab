import { Compass, FolderKanban, Home, PlusCircle, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const mobileNavItems: NavItem[] = [
  { label: "首页", href: "/", icon: Home },
  { label: "发现", href: "/works", icon: Compass },
  { label: "发布作品", href: "/publish", icon: PlusCircle },
  { label: "项目", href: "/projects", icon: FolderKanban },
  { label: "我的", href: "/me", icon: User }
];
