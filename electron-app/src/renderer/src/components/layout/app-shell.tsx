import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen, PanelRightClose } from "lucide-react";

interface AppShellProps {
  sidebar: ReactNode;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, header, footer, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-surface text-foreground">
      <div
        className={cn(
          "relative hidden h-full w-72 flex-col border-r border-border/60 bg-layer backdrop-blur-xl transition-all duration-300 lg:flex",
          sidebarOpen ? "opacity-100" : "-ml-72 opacity-0",
        )}
      >
        {sidebar}
      </div>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-layer/80 backdrop-blur-xl">
          <div className="flex items-center gap-2 px-5 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-9 w-9 lg:inline-flex"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              <span className="sr-only">切换侧栏</span>
            </Button>
            <div className="flex-1">{header}</div>
          </div>
        </header>
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
        {footer ? (
          <footer className="border-t border-border/60 bg-layer/70 backdrop-blur-xl">
            <div className="px-5 py-4">{footer}</div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
