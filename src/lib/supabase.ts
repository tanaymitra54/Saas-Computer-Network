import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvtvmfudfkzskpiwjyat.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dHZtZnVkZmt6c2twaXdqeWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNjI0MzgsImV4cCI6MjA3NzgzODQzOH0.3h_PIKkhZ-89MmSqn42sFUUwR3tAte7uW8nxfK0KtTI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database types
export interface Host {
  id: string;
  organization_id: string;
  hostname: string;
  os_type: string;
  os_version?: string;
  ip_address?: string;
  mac_address?: string;
  agent_version?: string;
  last_seen: string;
  status: 'online' | 'offline' | 'error';
  agent_config?: any;
  created_at: string;
  updated_at: string;
}

export interface Process {
  id: string;
  host_id: string;
  pid: number;
  name: string;
  path?: string;
  command_line?: string;
  user_name?: string;
  cpu_percent: number;
  memory_mb: number;
  started_at?: string;
  status: 'running' | 'stopped' | 'blocked';
  hash_sha256?: string;
  created_at: string;
  updated_at: string;
  network_usage_kbps?: number;
}

export interface Connection {
  id: string;
  host_id: string;
  process_id: string;
  local_ip?: string;
  local_port?: number;
  remote_ip?: string;
  remote_port?: number;
  protocol: string;
  state: string;
  bytes_sent: number;
  bytes_received: number;
  packets_sent: number;
  packets_received: number;
  connection_start: string;
  connection_end?: string;
  country_code?: string;
  asn?: number;
  domain_name?: string;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  organization_id: string;
  host_id: string;
  process_id?: string;
  connection_id?: string;
  type: 'security' | 'bandwidth' | 'anomaly' | 'blocked';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string;
  status: 'active' | 'resolved' | 'dismissed';
  metadata?: any;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface NetworkStats {
  id: string;
  host_id: string;
  process_id?: string;
  timestamp: string;
  bytes_in: number;
  bytes_out: number;
  packets_in: number;
  packets_out: number;
  connections_count: number;
  period: string;
}

// Authentication helpers
export const auth = {
  signUp: async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getUser: () => {
    return supabase.auth.getUser();
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Data access functions
export const db = {
  hosts: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('hosts')
        .select('*')
        .order('last_seen', { ascending: false });
      return { data, error };
    },

    getById: async (id: string) => {
      const { data, error } = await supabase
        .from('hosts')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },

    subscribe: (callback: (payload: any) => void) => {
      return supabase
        .channel('hosts_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'hosts' }, 
          callback
        )
        .subscribe();
    }
  },

  processes: {
    getByHostId: async (hostId: string) => {
      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .eq('host_id', hostId)
        .order('cpu_percent', { ascending: false });
      return { data, error };
    },

    subscribe: (hostId: string, callback: (payload: any) => void) => {
      return supabase
        .channel(`processes_${hostId}`)
        .on('postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'processes',
            filter: `host_id=eq.${hostId}`
          },
          callback
        )
        .subscribe();
    }
  },

  connections: {
    getByHostId: async (hostId: string, limit = 100) => {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          processes(name, pid)
        `)
        .eq('host_id', hostId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    subscribe: (hostId: string, callback: (payload: any) => void) => {
      return supabase
        .channel(`connections_${hostId}`)
        .on('postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'connections',
            filter: `host_id=eq.${hostId}`
          },
          callback
        )
        .subscribe();
    },

    blockConnection: async (connectionId: string) => {
      const { data, error } = await supabase
        .from('connections')
        .update({ is_blocked: true })
        .eq('id', connectionId)
        .select()
        .single();
      return { data, error };
    }
  },

  alerts: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          hosts(hostname),
          processes(name, pid)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    resolve: async (alertId: string, userId: string) => {
      const { data, error } = await supabase
        .from('alerts')
        .update({
          status: 'resolved',
          resolved_by: userId,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();
      return { data, error };
    },

    subscribe: (callback: (payload: any) => void) => {
      return supabase
        .channel('alerts_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'alerts' },
          callback
        )
        .subscribe();
    }
  },

  networkStats: {
    getByHostId: async (hostId: string, period = '1h', limit = 100) => {
      const { data, error } = await supabase
        .from('network_stats')
        .select('*')
        .eq('host_id', hostId)
        .eq('period', period)
        .order('timestamp', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    subscribe: (hostId: string, callback: (payload: any) => void) => {
      return supabase
        .channel(`network_stats_${hostId}`)
        .on('postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'network_stats',
            filter: `host_id=eq.${hostId}`
          },
          callback
        )
        .subscribe();
    }
  },

  pairing: {
    generateToken: async () => {
      const { data, error } = await supabase.functions.invoke('agent-auth', {
        body: { action: 'generate_token' }
      });
      return { data, error };
    },

    pairAgent: async (token: string, agentInfo: any) => {
      const { data, error } = await supabase.functions.invoke('agent-auth', {
        body: { 
          action: 'pair_agent',
          token,
          ...agentInfo
        }
      });
      return { data, error };
    }
  }
};

export default supabase;