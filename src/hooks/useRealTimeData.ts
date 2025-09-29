import { useState, useEffect, useCallback } from 'react';
import { db, Host, Process, Connection, Alert, NetworkStats } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

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
  const loadData = useCallback(async () => {
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

      // If we have hosts and no selected host, select the first one
      if (hostsData && hostsData.length > 0 && !selectedHostId) {
        setSelectedHostId(hostsData[0].id);
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

  // Load host-specific data
  const loadHostData = useCallback(async (hostId: string) => {
    try {
      // Load processes
      const { data: processesData, error: processesError } = await db.processes.getByHostId(hostId);
      if (processesError) throw processesError;
      setProcesses(processesData || []);

      // Load connections
      const { data: connectionsData, error: connectionsError } = await db.connections.getByHostId(hostId);
      if (connectionsError) throw connectionsError;
      setConnections(connectionsData || []);

      // Load network stats
      const { data: statsData, error: statsError } = await db.networkStats.getByHostId(hostId, '1m');
      if (statsError) throw statsError;
      setNetworkStats(statsData || []);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load host data';
      console.error('Error loading host data:', errorMessage);
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscriptions: any[] = [];

    // Subscribe to hosts changes
    const hostsChannel = db.hosts.subscribe((payload) => {
      console.log('Hosts update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setHosts(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setHosts(prev => prev.map(host => 
          host.id === payload.new.id ? payload.new : host
        ));
      } else if (payload.eventType === 'DELETE') {
        setHosts(prev => prev.filter(host => host.id !== payload.old.id));
      }
    });
    subscriptions.push(hostsChannel);

    // Subscribe to alerts changes
    const alertsChannel = db.alerts.subscribe((payload) => {
      console.log('Alerts update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setAlerts(prev => [payload.new, ...prev]);
        toast({
          title: `New ${payload.new.severity} alert`,
          description: payload.new.title,
          variant: payload.new.severity === 'high' || payload.new.severity === 'critical' ? "destructive" : "default",
        });
      } else if (payload.eventType === 'UPDATE') {
        setAlerts(prev => prev.map(alert => 
          alert.id === payload.new.id ? payload.new : alert
        ));
      }
    });
    subscriptions.push(alertsChannel);

    return () => {
      subscriptions.forEach(channel => {
        if (channel && typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        }
      });
    };
  }, [toast]);

  // Subscribe to host-specific real-time updates
  useEffect(() => {
    if (!selectedHostId) return;

    const subscriptions: any[] = [];

    // Subscribe to processes changes for selected host
    const processesChannel = db.processes.subscribe(selectedHostId, (payload) => {
      console.log('Processes update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setProcesses(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setProcesses(prev => prev.map(process => 
          process.id === payload.new.id ? payload.new : process
        ));
      } else if (payload.eventType === 'DELETE') {
        setProcesses(prev => prev.filter(process => process.id !== payload.old.id));
      }
    });
    subscriptions.push(processesChannel);

    // Subscribe to connections changes for selected host
    const connectionsChannel = db.connections.subscribe(selectedHostId, (payload) => {
      console.log('Connections update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setConnections(prev => [payload.new, ...prev.slice(0, 99)]); // Keep only last 100
      } else if (payload.eventType === 'UPDATE') {
        setConnections(prev => prev.map(conn => 
          conn.id === payload.new.id ? payload.new : conn
        ));
      } else if (payload.eventType === 'DELETE') {
        setConnections(prev => prev.filter(conn => conn.id !== payload.old.id));
      }
    });
    subscriptions.push(connectionsChannel);

    // Subscribe to network stats for selected host
    const networkStatsChannel = db.networkStats.subscribe(selectedHostId, (payload) => {
      console.log('Network stats update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setNetworkStats(prev => [payload.new, ...prev.slice(0, 99)]); // Keep only last 100
      }
    });
    subscriptions.push(networkStatsChannel);

    // Load initial host data
    loadHostData(selectedHostId);

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
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    await loadData();
    if (selectedHostId) {
      await loadHostData(selectedHostId);
    }
  }, [loadData, loadHostData, selectedHostId]);

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