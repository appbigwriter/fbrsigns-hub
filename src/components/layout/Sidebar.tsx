import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  UserCog,
  FileText, 
  Receipt, 
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Tag,
  Truck,
  Package2,
  DollarSign,
  CreditCard
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Users", href: "/users", icon: UserCog },
  { name: "Categories", href: "/categories", icon: Tag },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Raw Materials", href: "/raw-materials", icon: Package2 },
  { name: "Expenses", href: "/expenses", icon: DollarSign },
  { name: "Quotes", href: "/quotes", icon: FileText },
  { name: "Invoices", href: "/invoices", icon: Receipt },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "QuickBooks", href: "/quickbooks", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-collapse on mobile
  const isCollapsed = collapsed || isMobile;

  if (isMobile) {
    // Mobile layout: horizontal grid with 3 rows
    return (
      <div className="bg-sidebar border-b border-sidebar-border p-2">
        <div className="grid grid-cols-5 gap-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium transition-colors min-h-[60px]",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground"
                )
              }
              title={item.name}
            >
              <item.icon className="h-4 w-4 mb-1" />
              <span className="text-[10px] leading-tight text-center">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </div>
    );
  }

  // Desktop layout: vertical sidebar
  return (
    <div className={cn(
      "h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-sidebar-foreground">FBRSigns</h2>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-sidebar-accent transition-colors hidden md:block"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-sidebar-foreground" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-2">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground",
                    isCollapsed ? "justify-center" : ""
                  )
                }
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-5 w-5", isCollapsed ? "mr-0" : "mr-3")} />
                {!isCollapsed && <span className="hidden md:inline">{item.name}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}