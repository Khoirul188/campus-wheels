import { Link, useRouterState } from "@tanstack/react-router";
import {
  Car,
  House,
  CalendarPlus,
  ListChecks,
  ClipboardCheck,
  Settings,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, hasAnyRole } from "@/lib/use-auth";
import logoUgm from "@/assets/logo-ugm.png";
import campusRideText from "@/assets/campus-ride.png";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: House },
  { title: "Katalog Kendaraan", url: "/kendaraan", icon: Car },
  { title: "Ajukan Reservasi", url: "/reservasi/baru", icon: CalendarPlus },
  { title: "Reservasi Saya", url: "/reservasi", icon: ListChecks },
];

const staffItems = [
  { title: "Persetujuan", url: "/approval", icon: ClipboardCheck },
];

const adminItems = [
  { title: "Kelola Kendaraan", url: "/admin/kendaraan", icon: Settings },
  { title: "Kelola Pengguna", url: "/admin/pengguna", icon: Users },
];

export function AppSidebar() {
  const { roles, profile, user } = useAuth();
  void roles;
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const isStaff = hasAnyRole(roles, ["staf", "admin"]);
  const isAdmin = hasAnyRole(roles, ["admin"]);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <img src={logoUgm} alt="Logo UGM" className="h-8 w-8 shrink-0 object-contain" />
          {!collapsed && (
            <img
              src={campusRideText}
              alt="Campus Ride"
              className="h-6 w-auto object-contain"
            />
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isStaff && (
          <SidebarGroup>
            <SidebarGroupLabel>Staf</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {staffItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-2 text-xs text-sidebar-foreground/80">
          <div className="font-medium truncate">{profile?.full_name || user?.email}</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}