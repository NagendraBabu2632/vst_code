import { LayoutDashboard, Zap, Activity, Bell, FileText } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import vstLogo from "@/assets/vst-factory-logo.jfif";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Executive Summary", url: "/", icon: LayoutDashboard },
  { title: "Energy Monitoring", url: "/energy", icon: Zap },
  { title: "Process Analysis", url: "/process", icon: Activity },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Reports", url: "/reports", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={vstLogo} alt="Digital Factory System" className="h-12 w-12 rounded-lg object-cover shadow-sm ring-1 ring-primary/20" />
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-sidebar-accent-foreground">Digital Factory System</h2>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={`hover:bg-sidebar-accent/60 ${isActive ? "bg-sidebar-accent text-primary font-medium" : ""}`}
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="text-[10px] text-sidebar-foreground/50 text-center">
            Digital Factory System v2.1
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
