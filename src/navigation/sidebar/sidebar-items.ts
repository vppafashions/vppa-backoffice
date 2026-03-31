import { Gauge, Image, Layers, type LucideIcon, ReceiptText, ShoppingBag } from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboard",
    items: [
      {
        title: "Overview",
        url: "/dashboard/overview",
        icon: Gauge,
      },
    ],
  },
  {
    id: 2,
    label: "Catalog",
    items: [
      {
        title: "Products",
        url: "/dashboard/products",
        icon: ShoppingBag,
      },
      {
        title: "Collections",
        url: "/dashboard/collections",
        icon: Layers,
      },
    ],
  },
  {
    id: 3,
    label: "Hero Sections",
    items: [
      {
        title: "Homepage",
        url: "/dashboard/heroes/homepage",
        icon: Image,
      },
      {
        title: "Velocity",
        url: "/dashboard/heroes/velocity",
        icon: Image,
      },
      {
        title: "Presence",
        url: "/dashboard/heroes/presence",
        icon: Image,
      },
      {
        title: "Power",
        url: "/dashboard/heroes/power",
        icon: Image,
      },
      {
        title: "Attitude",
        url: "/dashboard/heroes/attitude",
        icon: Image,
      },
    ],
  },
  {
    id: 4,
    label: "Sales",
    items: [
      {
        title: "Orders",
        url: "/dashboard/orders",
        icon: ReceiptText,
      },
    ],
  },
];
