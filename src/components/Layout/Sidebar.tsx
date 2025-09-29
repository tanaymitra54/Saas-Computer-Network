import { cn } from "@/lib/utils";
import { 
  Activity, 
  Shield, 
  Monitor, 
  Settings, 
  Users, 
  AlertTriangle,
  BarChart3,
  Network
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  className?: string;
}

const navigationItems = [
  { icon: BarChart3, label: "Dashboard", href: "/", active: true },
  { icon: Monitor, label: "Hosts", href: "/hosts" },
  { icon: Activity, label: "Processes", href: "/processes" },
  { icon: Network, label: "Connections", href: "/connections" },
  { icon: Shield, label: "Firewall", href: "/firewall" },
  { icon: AlertTriangle, label: "Alerts", href: "/alerts" },
  { icon: Users, label: "Users", href: "/users" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside className={cn(
      "flex h-screen w-64 flex-col bg-gradient-card border-r border-border shadow-luxury",
      className
    )}>
      {/* Logo Section */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-gold">
          <Network className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground">SaaS Zero</h1>
          <p className="text-xs text-muted-foreground">Network Monitor</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-4 py-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.label}
              variant={item.active ? "default" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start gap-3 h-10 font-medium transition-all duration-200",
                item.active 
                  ? "bg-primary text-primary-foreground shadow-gold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © github.com/odaysec
        </p>
      </div>
    </aside>
  );
}