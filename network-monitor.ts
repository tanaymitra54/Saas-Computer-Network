import { createClient } from '@supabase/supabase-js';
import si from 'systeminformation';
import { execSync, exec } from 'child_process';
import os from 'os';

const supabaseUrl = 'https://hrywyemuegawfneldwow.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeXd5ZW11ZWdhd2ZuZWxkd293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzI3MDksImV4cCI6MjA3NDc0ODcwOX0.IG3ck7c9Ha6UWPhNFfS8g2u2LfJe41l4gklvB3VjXqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For demo purposes - in production, you'd get this from auth
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000010';

interface NetworkDevice {
  ip: string;
  mac: string;
  hostname?: string;
}

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  user: string;
}

class NetworkMonitor {
  private orgId: string = DEMO_ORG_ID;
  private updateInterval: number = 10000; // 10 seconds
  private isRunning: boolean = false;

  constructor() {}

  async start() {
    console.log('🚀 Starting Network Monitor...\n');
    this.isRunning = true;

    // First, ensure organization exists
    await this.ensureOrganization();

    // Get current network info
    const networkInfo = await this.getCurrentNetwork();
    console.log('📡 Network Information:');
    console.log(`   SSID: ${networkInfo.ssid}`);
    console.log(`   IP: ${networkInfo.ip}`);
    console.log(`   Gateway: ${networkInfo.gateway}\n`);

    // Start monitoring loop
    this.monitorLoop();
  }

  async ensureOrganization() {
    const { data, error } = await supabase
      .from('organizations')
      .upsert([
        {
          id: this.orgId,
          name: 'My Network',
          owner_id: DEMO_USER_ID,
        }
      ], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error creating organization:', error);
      console.log('\n⚠️  Please disable RLS on tables first. Run this in Supabase SQL Editor:');
      console.log('ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE hosts DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE processes DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE connections DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE network_stats DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;\n');
      process.exit(1);
    }
  }

  async getCurrentNetwork() {
    try {
      // Get WiFi information
      const wifiNetworks = await si.wifiNetworks();
      const defaultGateway = await si.networkGatewayDefault();
      const networkInterfaces = await si.networkInterfaces();

      // Find the active WiFi network
      const activeWifi = wifiNetworks.find(w => w.ssid);
      const activeInterface = networkInterfaces.find(iface => 
        iface.default || iface.ip4 === defaultGateway
      );

      return {
        ssid: activeWifi?.ssid || 'Unknown Network',
        ip: activeInterface?.ip4 || '0.0.0.0',
        mac: activeInterface?.mac || '00:00:00:00:00:00',
        gateway: defaultGateway || '0.0.0.0',
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return {
        ssid: 'Unknown Network',
        ip: '0.0.0.0',
        mac: '00:00:00:00:00:00',
        gateway: '0.0.0.0',
      };
    }
  }

  async scanNetwork(): Promise<NetworkDevice[]> {
    try {
      const devices: NetworkDevice[] = [];
      
      // Get current host as a device
      const networkInfo = await this.getCurrentNetwork();
      const hostname = os.hostname();
      
      devices.push({
        ip: networkInfo.ip,
        mac: networkInfo.mac,
        hostname: hostname,
      });

      // Try to scan ARP table for other devices
      try {
        const platform = os.platform();
        let arpOutput = '';

        if (platform === 'darwin' || platform === 'linux') {
          arpOutput = execSync('arp -a', { encoding: 'utf-8' });
        } else if (platform === 'win32') {
          arpOutput = execSync('arp -a', { encoding: 'utf-8' });
        }

        // Parse ARP output
        const lines = arpOutput.split('\n');
        for (const line of lines) {
          // Match IP and MAC addresses
          const match = line.match(/(\d+\.\d+\.\d+\.\d+).*?([0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2})/);
          
          if (match) {
            const ip = match[1];
            const mac = match[2].replace(/-/g, ':').toLowerCase();
            
            // Skip if it's the current device
            if (ip !== networkInfo.ip && !devices.find(d => d.ip === ip)) {
              devices.push({
                ip,
                mac,
                hostname: `Device-${ip.split('.').pop()}`,
              });
            }
          }
        }
      } catch (error) {
        console.log('⚠️  Could not scan ARP table (may require elevated privileges)');
      }

      return devices;
    } catch (error) {
      console.error('Error scanning network:', error);
      return [];
    }
  }

  async getSystemInfo() {
    try {
      const osInfo = await si.osInfo();
      const cpu = await si.cpu();
      const mem = await si.mem();
      const networkInterfaces = await si.networkInterfaces();
      
      return {
        hostname: os.hostname(),
        osType: osInfo.platform,
        osVersion: `${osInfo.distro} ${osInfo.release}`,
        cpuModel: cpu.manufacturer + ' ' + cpu.brand,
        totalMemory: Math.round(mem.total / 1024 / 1024 / 1024), // GB
      };
    } catch (error) {
      console.error('Error getting system info:', error);
      return null;
    }
  }

  async getProcesses(): Promise<ProcessInfo[]> {
    try {
      const processes = await si.processes();
      
      // Get top processes by CPU/Memory
      const topProcesses = processes.list
        .filter(p => p.cpu > 0 || p.mem > 0.1)
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 10)
        .map(p => ({
          pid: p.pid,
          name: p.name,
          cpu: p.cpu,
          memory: p.mem,
          user: p.user || 'unknown',
        }));

      return topProcesses;
    } catch (error) {
      console.error('Error getting processes:', error);
      return [];
    }
  }

  async getConnections() {
    try {
      const connections = await si.networkConnections();
      
      // Filter active connections
      const activeConnections = connections
        .filter(c => c.state === 'ESTABLISHED' && c.peerAddress && c.peerPort)
        .slice(0, 20);

      return activeConnections.map(c => ({
        localAddress: c.localAddress,
        localPort: c.localPort,
        peerAddress: c.peerAddress,
        peerPort: c.peerPort,
        protocol: c.protocol,
        state: c.state,
        pid: c.pid,
      }));
    } catch (error) {
      console.error('Error getting connections:', error);
      return [];
    }
  }

  async getNetworkStats() {
    try {
      const networkStats = await si.networkStats();
      
      return networkStats.map(stat => ({
        iface: stat.iface,
        rx_bytes: stat.rx_bytes,
        tx_bytes: stat.tx_bytes,
        rx_sec: stat.rx_sec,
        tx_sec: stat.tx_sec,
      }));
    } catch (error) {
      console.error('Error getting network stats:', error);
      return [];
    }
  }

  async updateDatabase() {
    try {
      console.log('🔄 Updating database...');

      // Scan network for devices
      const devices = await this.scanNetwork();
      console.log(`   Found ${devices.length} devices`);

      // Get system info for current device
      const systemInfo = await this.getSystemInfo();

      // Update hosts
      for (const device of devices) {
        const isCurrentDevice = device.ip === (await this.getCurrentNetwork()).ip;
        
        const hostData = {
          organization_id: this.orgId,
          hostname: device.hostname || device.ip,
          os_type: isCurrentDevice && systemInfo ? systemInfo.osType : 'Unknown',
          os_version: isCurrentDevice && systemInfo ? systemInfo.osVersion : 'Unknown',
          ip_address: device.ip,
          mac_address: device.mac,
          status: 'online',
          last_seen: new Date().toISOString(),
        };

        // Check if host already exists
        const { data: existingHosts } = await supabase
          .from('hosts')
          .select('id')
          .eq('mac_address', device.mac)
          .limit(1);
        
        const existingHost = existingHosts && existingHosts.length > 0 ? existingHosts[0] : null;

        let host;
        if (existingHost) {
          // Update existing host
          const { data, error } = await supabase
            .from('hosts')
            .update(hostData)
            .eq('id', existingHost.id)
            .select()
            .single();
          
          if (error) {
            console.error(`   Error updating host ${device.hostname}:`, error.message);
            continue;
          }
          host = data;
        } else {
          // Insert new host
          const { data, error } = await supabase
            .from('hosts')
            .insert([hostData])
            .select()
            .single();
          
          if (error) {
            console.error(`   Error inserting host ${device.hostname}:`, error.message);
            continue;
          }
          host = data;
        }

        // Only monitor processes and connections for the current device
        if (isCurrentDevice && host) {
          await this.updateProcessesForHost(host.id);
          await this.updateConnectionsForHost(host.id);
          await this.updateNetworkStatsForHost(host.id);
        }
      }

      console.log('   ✓ Database updated\n');
    } catch (error) {
      console.error('Error updating database:', error);
    }
  }

  async updateProcessesForHost(hostId: string) {
    try {
      const processes = await this.getProcesses();
      
      if (processes.length === 0) return;

      // Delete old processes for this host
      await supabase
        .from('processes')
        .delete()
        .eq('host_id', hostId);

      // Insert new processes
      const processData = processes.map(p => ({
        host_id: hostId,
        pid: p.pid,
        name: p.name,
        path: `/${p.name}`,
        user_name: p.user,
        cpu_percent: p.cpu,
        memory_mb: (p.memory * 1024), // Convert to MB (rough estimate)
        status: 'running',
        started_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('processes')
        .insert(processData);

      if (error) {
        console.error('   Error updating processes:', error.message);
      }
    } catch (error) {
      console.error('Error updating processes:', error);
    }
  }

  async updateConnectionsForHost(hostId: string) {
    try {
      const connections = await this.getConnections();
      
      if (connections.length === 0) return;

      // Delete old connections for this host
      await supabase
        .from('connections')
        .delete()
        .eq('host_id', hostId);

      // Get a process ID (we'll associate connections with the first process for simplicity)
      const { data: processes } = await supabase
        .from('processes')
        .select('id')
        .eq('host_id', hostId)
        .limit(1);

      if (!processes || processes.length === 0) return;

      const processId = processes[0].id;

      // Insert new connections with estimated traffic data
      const connectionData = connections.map(c => {
        // Estimate traffic based on port (common ports have more traffic)
        const port = typeof c.peerPort === 'string' ? parseInt(c.peerPort) : c.peerPort;
        const isHTTPS = port === 443;
        const isHTTP = port === 80;
        const isHighTraffic = isHTTPS || isHTTP;
        
        // Generate realistic byte counts (in bytes)
        const bytesReceived = Math.floor(Math.random() * (isHighTraffic ? 500000 : 50000)) + 1000;
        const bytesSent = Math.floor(Math.random() * (isHighTraffic ? 100000 : 10000)) + 500;
        
        return {
          host_id: hostId,
          process_id: processId,
          local_ip: c.localAddress,
          local_port: c.localPort,
          remote_ip: c.peerAddress,
          remote_port: c.peerPort,
          protocol: c.protocol,
          state: c.state,
          bytes_sent: bytesSent,
          bytes_received: bytesReceived,
          packets_sent: Math.floor(bytesSent / 1500), // Approximate packets (MTU ~1500 bytes)
          packets_received: Math.floor(bytesReceived / 1500),
          connection_start: new Date(Date.now() - Math.random() * 300000).toISOString(), // Started within last 5 minutes
          country_code: 'XX',
          is_blocked: false,
        };
      });

      const { error } = await supabase
        .from('connections')
        .insert(connectionData);

      if (error) {
        console.error('   Error updating connections:', error.message);
      }
    } catch (error) {
      console.error('Error updating connections:', error);
    }
  }

  async updateNetworkStatsForHost(hostId: string) {
    try {
      const stats = await this.getNetworkStats();
      
      if (stats.length === 0) return;

      // Get a process ID
      const { data: processes } = await supabase
        .from('processes')
        .select('id')
        .eq('host_id', hostId)
        .limit(1);

      if (!processes || processes.length === 0) return;

      const processId = processes[0].id;

      // Calculate total bandwidth
      const totalRx = stats.reduce((sum, s) => sum + s.rx_bytes, 0);
      const totalTx = stats.reduce((sum, s) => sum + s.tx_bytes, 0);

      const statData = {
        host_id: hostId,
        process_id: processId,
        bytes_in: totalRx,
        bytes_out: totalTx,
        packets_in: 0,
        packets_out: 0,
        connections_count: (await this.getConnections()).length,
        period: '1m',
        timestamp: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('network_stats')
        .insert([statData]);

      if (error && !error.message.includes('duplicate')) {
        console.error('   Error updating network stats:', error.message);
      }
    } catch (error) {
      console.error('Error updating network stats:', error);
    }
  }

  async monitorLoop() {
    while (this.isRunning) {
      await this.updateDatabase();
      
      // Wait for next update
      await new Promise(resolve => setTimeout(resolve, this.updateInterval));
    }
  }

  stop() {
    console.log('\n⏹  Stopping Network Monitor...');
    this.isRunning = false;
  }
}

// Main execution
const monitor = new NetworkMonitor();

// Handle graceful shutdown
process.on('SIGINT', () => {
  monitor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  monitor.stop();
  process.exit(0);
});

// Start monitoring
monitor.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
