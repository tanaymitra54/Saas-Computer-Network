import { StatsCard } from "@/components/Dashboard/StatsCard";
import { NetworkChart } from "@/components/Dashboard/NetworkChart";
import { ProcessList } from "@/components/Dashboard/ProcessList";
import { ConnectionsTable } from "@/components/Dashboard/ConnectionsTable";
import { AlertsList } from "@/components/Dashboard/AlertsList";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import { 
  Monitor, 
  Shield, 
  Wifi,
  TrendingUp
} from "lucide-react";

const Index = () => {
  const {
    hosts = [],
    processes = [],
    connections = [],
    alerts = [],
    networkStats = [],
    loading = false,
    error = null,
    selectedHostId = null,
    setSelectedHostId = () => {},
    refreshData = () => {}
  } = useRealTimeData() || {};

  // Calculate stats
  const activeHosts = hosts.filter(h => h?.status === 'online').length;
  
  // Count unique devices (unique remote IPs) connected to the WiFi
  const uniqueDevices = new Set(
    connections
      .filter(conn => conn.remote_ip && conn.remote_ip !== '0.0.0.0' && conn.remote_ip !== '::')
      .map(conn => conn.remote_ip)
  ).size;
  
  const activeAlerts = alerts.filter(a => a?.status === 'active').length;
  
  // Calculate bandwidth
  const recentStats = networkStats?.slice(0, 60) || [];
  const totalBandwidth = recentStats.reduce((sum, stat) => 
    sum + (stat?.bytes_in || 0) + (stat?.bytes_out || 0), 0
  ) / (1024 * 1024 * 1024); // Convert to GB

  return (
    <div className="min-h-screen bg-background">
      <main className="p-6 space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <p className="text-destructive text-sm">Error: {error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Active Hosts"
            value={activeHosts.toString()}
            change={`${hosts.length} total hosts`}
            changeType={activeHosts > 0 ? "positive" : "neutral"}
            icon={Monitor}
          />
          <StatsCard
            title="Connected Devices"
            value={uniqueDevices.toString()}
            change={`On ${activeHosts} ${activeHosts === 1 ? 'host' : 'hosts'}`}
            changeType={uniqueDevices > 0 ? "positive" : "neutral"}
            icon={Wifi}
          />
          <StatsCard
            title="Bandwidth Usage"
            value={`${totalBandwidth.toFixed(2)} GB/h`}
            change="Last hour total"
            changeType="neutral"
            icon={TrendingUp}
          />
          <StatsCard
            title="Security Alerts"
            value={activeAlerts.toString()}
            change={activeAlerts > 0 ? "Requires attention" : "All clear"}
            changeType={activeAlerts > 0 ? "negative" : "positive"} 
            icon={Shield}
          />
        </div>

        {/* Charts & Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <NetworkChart 
              data={networkStats} 
              loading={loading}
              selectedHostId={selectedHostId}
            />
          </div>
          <AlertsList 
            alerts={alerts}
            loading={loading}
            onRefresh={refreshData}
          />
        </div>

        {/* Process & Connections */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ProcessList 
            processes={processes}
            hosts={hosts}
            selectedHostId={selectedHostId}
            onHostChange={setSelectedHostId}
            loading={loading}
          />
          <ConnectionsTable 
            connections={connections}
            processes={processes}
            loading={loading}
            onRefresh={async () => {
              if (refreshData) {
                await Promise.resolve(refreshData());
              }
            }}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 px-6 py-3 mt-6">
        <p className="text-xs text-muted-foreground text-center">
          SaaS Zero Monitoring Traffic Network - Copyright © github.com/odaysec
        </p>
      </footer>
    </div>
  );
};

export default Index;
