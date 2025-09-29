import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, X, RefreshCw } from "lucide-react";
import { Alert } from '@/lib/supabase';

interface AlertsListProps {
  alerts?: Alert[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function AlertsList({ alerts = [], loading = false, onRefresh }: AlertsListProps) {
  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg font-semibold text-foreground">
          <span>Security Alerts</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
              {alerts.filter(a => a.status === "active").length} Active
            </Badge>
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => {
            const Icon = alert.type === "security" ? Shield : AlertTriangle;
            return (
              <div 
                key={alert.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-card-secondary/50 border border-border/50 hover:bg-card-secondary/80 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 mt-1">
                  <Icon className="h-4 w-4 text-destructive" />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={
                        alert.severity === "high" ? "bg-destructive/10 text-destructive border-destructive/20" :
                        alert.severity === "medium" ? "bg-warning/10 text-warning border-warning/20" :
                        "bg-primary/10 text-primary border-primary/20"
                      }>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {alert.status === "active" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs">
                          Block IP
                        </Button>
                        <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/80">
                          Investigate
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}