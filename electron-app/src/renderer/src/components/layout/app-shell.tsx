import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  sidebar: ReactNode;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, header, footer, children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="hidden w-72 flex-col border-r border-border bg-background/70 md:flex">
        {sidebar}
      </aside>
      <div className="flex flex-1 flex-col">
        <header className={cn("border-b border-border bg-background/80 backdrop-blur-md")}>{header}</header>
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
        {footer ? <footer className="border-t border-border bg-background/80">{footer}</footer> : null}
      </div>
    </div>
  );
}
