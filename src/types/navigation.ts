export type NavItem = {
  label: string;
  href: string;
};

export const mobileNavItems: NavItem[] = [
  { label: "首页", href: "/" },
  { label: "挑战", href: "/challenges" },
  { label: "发布", href: "/publish" },
  { label: "孵化", href: "/incubation" },
  { label: "我的", href: "/me" }
];
