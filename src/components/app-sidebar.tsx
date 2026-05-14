import { Link, useLocation } from "react-router-dom";
import { FileText, LayoutDashboard, Package, Plus, Settings, Receipt } from "lucide-react";
import logo from "@/assets/spag-logo.jpg";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Quotations", url: "/quotations", icon: FileText },
  { title: "New Quotation", url: "/quotations/new", icon: Plus },
  { title: "Bills", url: "/bills", icon: Receipt },
  { title: "New Bill", url: "/bills/new", icon: Plus },
  { title: "Products", url: "/products", icon: Package },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-3 px-2 py-2">
          <img src={logo} alt="SPAG" className="h-9 w-9 rounded-md bg-white object-contain p-0.5 ring-1 ring-sidebar-border" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">SPAG Global</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Quotation Studio
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
