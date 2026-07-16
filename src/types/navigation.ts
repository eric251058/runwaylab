import { Home, Images, PlusCircle, SwatchBook, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const mobileNavItems: NavItem[] = [
  { label: "首页", href: "/", icon: Home },
  { label: "作品", href: "/works", icon: Images },
  { label: "发布", href: "/publish", icon: PlusCircle },
  { label: "面料", href: "/fabrics", icon: SwatchBook },
  { label: "我的", href: "/me", icon: User }
];
