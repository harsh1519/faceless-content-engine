import {
  Film,
  LayoutDashboard,
  Radio,
  GitBranch,
  Tag,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  newLabel: string;
}

export const navItems: NavItem[] = [
  {
    title: "Command Center",
    href: "/",
    icon: LayoutDashboard,
    newLabel: "New Alert Rule",
  },
  {
    title: "Channels",
    href: "/channels",
    icon: Radio,
    newLabel: "New Channel",
  },
  {
    title: "Content Pipeline",
    href: "/pipeline",
    icon: GitBranch,
    newLabel: "New Content",
  },
  {
    title: "Long-form",
    href: "/long-form",
    icon: Film,
    newLabel: "New Long Project",
  },
  {
    title: "Offers",
    href: "/offers",
    icon: Tag,
    newLabel: "New Offer",
  },
  {
    title: "Audience Vault",
    href: "/audience",
    icon: Users,
    newLabel: "Import Leads",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    newLabel: "Add Integration",
  },
];

export function getNavItemForPath(pathname: string): NavItem {
  if (pathname === "/") return navItems[0];

  const match = navItems.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href)
  );
  return match ?? navItems[0];
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
