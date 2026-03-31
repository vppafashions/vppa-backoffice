import { Gauge, Layers, type LucideIcon, ReceiptText, ShoppingBag } from "lucide-react";

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
