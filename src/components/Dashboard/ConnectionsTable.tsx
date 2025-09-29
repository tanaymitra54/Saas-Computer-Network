import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, MapPin, Globe, RefreshCw } from "lucide-react";
import { Connection, Process } from '@/lib/supabase';

interface ConnectionsTableProps {
  connections: Connection[];
  processes: Process[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "ESTABLISHED": return "bg-success/10 text-success border-success/20";
    case "LISTENING": return "bg-primary/10 text-primary border-primary/20";
    case "CLOSED": return "bg-muted/10 text-muted-foreground border-muted/20";
    default: return "bg-warning/10 text-warning border-warning/20";
  }
};

export function ConnectionsTable({ connections, processes, loading, onRefresh }: ConnectionsTableProps) {
  const getProcessName = (processId: string) => {
    const process = processes.find(p => p.id === processId);
    return process?.name || 'Unknown';
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Active Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg font-semibold text-foreground">
          <span>Active Connections</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
              {connections.filter(c => c.state === "ESTABLISHED").length} Active
            </Badge>
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active connections found
            </div>
          ) : (
            connections.map((conn) => (
              <div 
                key={conn.id}
                className="flex items-center justify-between p-4 rounded-xl bg-card-secondary/50 border border-border/50 hover:bg-card-secondary/80 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{getProcessName(conn.process_id)}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {conn.remote_ip}:{conn.remote_port}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge className={getStatusColor(conn.state)}>
                    {conn.state}
                  </Badge>
                  
                  <div className="text-center min-w-[80px]">
                    <p className="text-sm font-medium text-foreground">{conn.protocol}</p>
                    <p className="text-xs text-muted-foreground">:{conn.local_port}</p>
                  </div>

                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{conn.country_code || 'Unknown'}</span>
                  </div>

                  <div className="text-center min-w-[100px]">
                    <p className="text-sm font-medium text-foreground">
                      ↓{((conn.bytes_received || 0) / 1024).toFixed(1)}KB
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ↑{((conn.bytes_sent || 0) / 1024).toFixed(1)}KB
                    </p>
                  </div>

                  <div className="text-sm text-muted-foreground min-w-[60px]">
                    {new Date(conn.created_at).toLocaleTimeString()}
                  </div>

                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                    <Shield className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}