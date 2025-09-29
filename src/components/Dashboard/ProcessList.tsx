import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ExternalLink, Activity } from "lucide-react";
import { Process, Host } from '@/lib/supabase';

interface ProcessListProps {
  processes: Process[];
  hosts: Host[];
  selectedHostId: string | null;
  onHostChange: (hostId: string | null) => void;
  loading: boolean;
}

export function ProcessList({ processes, hosts, selectedHostId, onHostChange, loading }: ProcessListProps) {
  if (loading) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Active Processes
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
          <span>Active Processes</span>
          <div className="flex items-center gap-3">
            <Select value={selectedHostId || ""} onValueChange={onHostChange}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="Select host" />
              </SelectTrigger>
              <SelectContent>
                {hosts.map((host) => (
                  <SelectItem key={host.id} value={host.id}>
                    {host.hostname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              {processes.length} Running
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {processes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No processes found for selected host
            </div>
          ) : (
            processes.map((process) => (
              <div 
                key={process.id}
                className="flex items-center justify-between p-4 rounded-xl bg-card-secondary/50 border border-border/50 hover:bg-card-secondary/80 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{process.name}</p>
                    <p className="text-sm text-muted-foreground">
                      PID: {process.pid} • User: {process.user_name || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-medium text-foreground">{process.cpu_percent?.toFixed(1) || 0}%</p>
                    <p className="text-muted-foreground">CPU</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">{process.memory_mb?.toFixed(1) || 0}MB</p>
                    <p className="text-muted-foreground">Memory</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">N/A</p>
                    <p className="text-muted-foreground">Network</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">N/A</p>
                    <p className="text-muted-foreground">Connections</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
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