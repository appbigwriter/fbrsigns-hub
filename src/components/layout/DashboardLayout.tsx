import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      <Header />
      
      {/* Mobile Layout */}
      <div className="md:hidden">
        <Sidebar />
        <main className="p-3 overflow-auto">
          {children}
        </main>
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden md:flex h-[calc(100vh-64px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}