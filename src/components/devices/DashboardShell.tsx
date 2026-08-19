import type { ReactNode } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
          <SidebarTrigger />
          <div className="h-6 w-px bg-border" />
          <span className="text-sm font-semibold tracking-tight">Fleet Telemetry</span>
          <span className="ml-auto text-xs text-muted-foreground">Live dashboard</span>
        </header>
        <SidebarInset className="p-6">{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}
