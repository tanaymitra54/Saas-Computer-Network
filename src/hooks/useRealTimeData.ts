import { useState, useEffect, useCallback, useMemo } from 'react';
import { db, Host, Process, Connection, Alert, NetworkStats } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealTimeDataReturn {
  hosts: Host[];
  processes: Process[];
  connections: Connection[];
  alerts: Alert[];
  networkStats: NetworkStats[];
  loading: boolean;
  error: string | null;
  selectedHostId: string | null;
  setSelectedHostId: (hostId: string | null) => void;
  refreshData: () => Promise<void>;
}

export function useRealTimeData(): UseRealTimeDataReturn {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load initial data
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Load hosts
      const { data: hostsData, error: hostsError } = await db.hosts.getAll();
      if (hostsError) throw hostsError;
      setHosts(hostsData || []);

      // Load alerts
      const { data: alertsData, error: alertsError } = await db.alerts.getAll();
      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

      // If we have hosts and no selected host, select the first one and load its data
      if (hostsData && hostsData.length > 0) {
        if (!selectedHostId) {
          const firstHostId = hostsData[0].id;
          setSelectedHostId(firstHostId);
          // Load data for the first host
          await loadHostData(firstHostId);
        } else {
          // If we already have a selected host, refresh its data
          await loadHostData(selectedHostId);
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      toast({
        title: "Error loading data",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedHostId, toast]);

  // Calculate network usage per process based on connections
  const calculateProcessNetworkUsage = useCallback((processes: Process[], connections: Connection[]) => {
    // Group connections by process_id
    const processNetworkUsage = new Map<string, { bytes_sent: number; bytes_received: number }>();
    
    connections.forEach(conn => {
      if (!conn.process_id) return;
      
      const existing = processNetworkUsage.get(conn.process_id) || { bytes_sent: 0, bytes_received: 0 };
      processNetworkUsage.set(conn.process_id, {
        bytes_sent: existing.bytes_sent + (conn.bytes_sent || 0),
        bytes_received: existing.bytes_received + (conn.bytes_received || 0)
      });
    });
    
    // Update processes with network usage
    return processes.map(proc => ({
      ...proc,
      network_usage_kbps: processNetworkUsage.has(proc.id) 
        ? (processNetworkUsage.get(proc.id)!.bytes_sent + processNetworkUsage.get(proc.id)!.bytes_received) / 1024 // Convert to KB/s
        : 0
    }));
  }, []);

  // Load host-specific data
  const loadHostData = useCallback(async (hostId: string): Promise<void> => {
    try {
      // Load processes
      const { data: processesData, error: processesError } = await db.processes.getByHostId(hostId);
      if (processesError) throw processesError;
      
      // Load connections
      const { data: connectionsData, error: connectionsError } = await db.connections.getByHostId(hostId);
      if (connectionsError) throw connectionsError;
      
      // Calculate network usage and update processes
      const processesWithNetwork = calculateProcessNetworkUsage(processesData || [], connectionsData || []);
      setProcesses(processesWithNetwork);
      setConnections(connectionsData || []);

      // Load network stats
      const { data: statsData, error: statsError } = await db.networkStats.getByHostId(hostId, '1m');
      if (statsError) throw statsError;
      setNetworkStats(statsData || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load host data';
      console.error('Error loading host data:', errorMessage);
    }
  }, [calculateProcessNetworkUsage]);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscriptions: RealtimeChannel[] = [];

    // Subscribe to hosts changes
    const hostsChannel = db.hosts.subscribe((payload) => {
      if (payload.eventType === 'INSERT') {
        setHosts(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setHosts(prev => prev.map(host => 
          host.id === payload.new.id ? payload.new : host
        ));
      } else if (payload.eventType === 'DELETE') {
        setHosts(prev => prev.filter(host => host.id !== payload.old.id));
      }
    });
    subscriptions.push(hostsChannel);

    // Subscribe to connections changes
    const connectionsChannel = db.connections.subscribe(selectedHostId || '', (payload) => {
      setConnections(prev => {
        let updatedConnections = [...prev];
        
        if (payload.eventType === 'INSERT') {
          updatedConnections = [...prev, payload.new];
        } else if (payload.eventType === 'UPDATE') {
          updatedConnections = prev.map(conn => 
            conn.id === payload.new.id ? payload.new : conn
          );
        } else if (payload.eventType === 'DELETE') {
          updatedConnections = prev.filter(conn => conn.id !== payload.old.id);
        }
        
        // Recalculate network usage for all processes when connections change
        setProcesses(prevProcesses => 
          calculateProcessNetworkUsage(prevProcesses, updatedConnections)
        );
        
        return updatedConnections;
      });
    });
    subscriptions.push(connectionsChannel);

    // Subscribe to alerts
    const alertsChannel = db.alerts.subscribe((payload) => {
      if (payload.eventType === 'INSERT') {
        setAlerts(prev => [...prev, payload.new]);
        toast({
          title: `New ${payload.new.severity} alert`,
          description: payload.new.title,
          variant: payload.new.severity === 'high' || payload.new.severity === 'critical' ? "destructive" : "default",
        });
      } else if (payload.eventType === 'UPDATE') {
        setAlerts(prev => prev.map(alert => 
          alert.id === payload.new.id ? payload.new : alert
        ));
      } else if (payload.eventType === 'DELETE') {
        setAlerts(prev => prev.filter(alert => alert.id !== payload.old.id));
      }
    });
    subscriptions.push(alertsChannel);

    // Subscribe to network stats
    subscriptions.push(connectionsChannel);

    // Subscribe to network stats changes for selected host
    if (selectedHostId) {
      const networkStatsChannel = db.networkStats.subscribe(selectedHostId, (payload) => {
        console.log('Network stats update:', payload);
        
        if (payload.eventType === 'INSERT') {
          setNetworkStats(prev => {
            // Ensure we have valid data
            if (!payload.new || !payload.new.timestamp) return prev;
            
            // Add the new stat and sort by timestamp in descending order
            const updated = [{
              ...payload.new,
              // Ensure numeric values
              bytes_in: Number(payload.new.bytes_in) || 0,
              bytes_out: Number(payload.new.bytes_out) || 0,
              packets_in: Number(payload.new.packets_in) || 0,
              packets_out: Number(payload.new.packets_out) || 0,
              connections_count: Number(payload.new.connections_count) || 0,
              timestamp: payload.new.timestamp
            }, ...prev];
            
            // Keep only the last 100 entries to prevent memory issues
            return updated.length > 100 ? updated.slice(0, 100) : updated;
          });
        }
      });
      
      if (networkStatsChannel) {
        subscriptions.push(networkStatsChannel);
      }
      
      // Also set up a periodic refresh in case we miss real-time updates
      const refreshInterval = setInterval(() => {
        loadHostData(selectedHostId).catch(console.error);
      }, 30000); // Refresh every 30 seconds
      
      return () => {
        clearInterval(refreshInterval);
        subscriptions.forEach(channel => {
          if (channel && typeof channel.unsubscribe === 'function') {
            channel.unsubscribe();
          }
        });
      };
    }

    // Load initial host data
    loadHostData(selectedHostId).catch(console.error);
    return () => {
      subscriptions.forEach(channel => {
        if (channel && typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        }
      });
    };
  }, [selectedHostId, loadHostData]);

  // Initial data load
  useEffect(() => {
    loadData().catch(console.error);
  }, [loadData]);

  // Refresh data when selected host changes
  useEffect(() => {
    if (selectedHostId) {
      loadHostData(selectedHostId).catch(console.error);
    }
  }, [selectedHostId, loadHostData]);

  // Create the refreshData function
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Reload all data
      await loadData();
      
      // If we have a selected host, reload its specific data
      if (selectedHostId) {
        await loadHostData(selectedHostId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      setError(errorMessage);
      toast({
        title: "Error refreshing data",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadData, loadHostData, selectedHostId, toast]);

  // Return the state and handlers
  return {
    hosts,
    processes,
    connections,
    alerts,
    networkStats,
    loading,
    error,
    selectedHostId,
    setSelectedHostId,
    refreshData
  };
}