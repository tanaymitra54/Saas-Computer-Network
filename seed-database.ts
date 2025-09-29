import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hrywyemuegawfneldwow.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeXd5ZW11ZWdhd2ZuZWxkd293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzI3MDksImV4cCI6MjA3NDc0ODcwOX0.IG3ck7c9Ha6UWPhNFfS8g2u2LfJe41l4gklvB3VjXqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // For demo purposes, we'll use a hardcoded user ID
    // In production, you'd create a real user through authentication
    const testUserId = '00000000-0000-0000-0000-000000000001';

    // Insert organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert([
        {
          id: '00000000-0000-0000-0000-000000000010',
          name: 'My Home Network',
          owner_id: testUserId,
        }
      ], { onConflict: 'id' })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return;
    }
    console.log('✓ Organization created');

    // Insert hosts
    const { data: hosts, error: hostsError } = await supabase
      .from('hosts')
      .upsert([
        {
          id: '00000000-0000-0000-0000-000000000011',
          organization_id: org.id,
          hostname: 'Home-Router',
          os_type: 'Linux',
          os_version: 'OpenWrt 21.02',
          ip_address: '192.168.1.1',
          mac_address: '00:11:22:33:44:55',
          status: 'online',
          last_seen: new Date().toISOString(),
        },
        {
          id: '00000000-0000-0000-0000-000000000012',
          organization_id: org.id,
          hostname: 'Desktop-PC',
          os_type: 'Windows',
          os_version: 'Windows 11',
          ip_address: '192.168.1.100',
          mac_address: '00:11:22:33:44:56',
          status: 'online',
          last_seen: new Date().toISOString(),
        },
        {
          id: '00000000-0000-0000-0000-000000000013',
          organization_id: org.id,
          hostname: 'Smartphone',
          os_type: 'Android',
          os_version: 'Android 13',
          ip_address: '192.168.1.101',
          mac_address: '00:11:22:33:44:57',
          status: 'online',
          last_seen: new Date().toISOString(),
        },
        {
          id: '00000000-0000-0000-0000-000000000014',
          organization_id: org.id,
          hostname: 'Smart-TV',
          os_type: 'Android TV',
          os_version: 'Android TV 11',
          ip_address: '192.168.1.102',
          mac_address: '00:11:22:33:44:58',
          status: 'online',
          last_seen: new Date().toISOString(),
        },
      ], { onConflict: 'id' })
      .select();

    if (hostsError) {
      console.error('Error creating hosts:', hostsError);
      return;
    }
    console.log('✓ Hosts created');

    // Get Desktop-PC host
    const desktopHost = hosts.find(h => h.hostname === 'Desktop-PC');
    if (!desktopHost) {
      console.error('Desktop-PC host not found');
      return;
    }

    // Insert processes
    const { data: processes, error: processesError } = await supabase
      .from('processes')
      .upsert([
        {
          id: '00000000-0000-0000-0000-000000000021',
          host_id: desktopHost.id,
          pid: 1234,
          name: 'chrome.exe',
          path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          user_name: 'Admin',
          cpu_percent: 15.5,
          memory_mb: 512.0,
          status: 'running',
          started_at: new Date().toISOString(),
        },
        {
          id: '00000000-0000-0000-0000-000000000022',
          host_id: desktopHost.id,
          pid: 5678,
          name: 'discord.exe',
          path: 'C:\\Users\\Admin\\AppData\\Local\\Discord\\app-1.0.9003\\Discord.exe',
          user_name: 'Admin',
          cpu_percent: 5.2,
          memory_mb: 256.0,
          status: 'running',
          started_at: new Date().toISOString(),
        },
        {
          id: '00000000-0000-0000-0000-000000000023',
          host_id: desktopHost.id,
          pid: 9012,
          name: 'code.exe',
          path: 'C:\\Users\\Admin\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',
          user_name: 'Admin',
          cpu_percent: 8.1,
          memory_mb: 384.0,
          status: 'running',
          started_at: new Date().toISOString(),
        },
      ], { onConflict: 'id' })
      .select();

    if (processesError) {
      console.error('Error creating processes:', processesError);
      return;
    }
    console.log('✓ Processes created');

    const chromeProcess = processes[0];

    // Insert connections
    const { error: connectionsError } = await supabase
      .from('connections')
      .upsert([
        {
          id: '00000000-0000-0000-0000-000000000031',
          host_id: desktopHost.id,
          process_id: chromeProcess.id,
          local_ip: '192.168.1.100',
          local_port: 52341,
          remote_ip: '142.250.191.14',
          remote_port: 443,
          protocol: 'TCP',
          state: 'ESTABLISHED',
          bytes_sent: 1024,
          bytes_received: 8192,
          packets_sent: 100,
          packets_received: 80,
          connection_start: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          country_code: 'US',
          is_blocked: false,
        },
        {
          id: '00000000-0000-0000-0000-000000000032',
          host_id: desktopHost.id,
          process_id: chromeProcess.id,
          local_ip: '192.168.1.100',
          local_port: 52342,
          remote_ip: '162.159.130.234',
          remote_port: 443,
          protocol: 'TCP',
          state: 'ESTABLISHED',
          bytes_sent: 512,
          bytes_received: 2048,
          packets_sent: 50,
          packets_received: 40,
          connection_start: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          country_code: 'US',
          is_blocked: false,
        },
      ], { onConflict: 'id' });

    if (connectionsError) {
      console.error('Error creating connections:', connectionsError);
      return;
    }
    console.log('✓ Connections created');

    // Insert network stats
    const { error: statsError } = await supabase
      .from('network_stats')
      .upsert([
        {
          id: '00000000-0000-0000-0000-000000000041',
          host_id: desktopHost.id,
          process_id: chromeProcess.id,
          bytes_in: 1048576,
          bytes_out: 524288,
          packets_in: 1000,
          packets_out: 800,
          connections_count: 5,
          period: '1m',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
        {
          id: '00000000-0000-0000-0000-000000000042',
          host_id: desktopHost.id,
          process_id: chromeProcess.id,
          bytes_in: 2097152,
          bytes_out: 1048576,
          packets_in: 2000,
          packets_out: 1600,
          connections_count: 8,
          period: '5m',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
      ], { onConflict: 'id' });

    if (statsError) {
      console.error('Error creating network stats:', statsError);
      return;
    }
    console.log('✓ Network stats created');

    // Insert alerts
    const { error: alertsError } = await supabase
      .from('alerts')
      .upsert([
        {
          id: '00000000-0000-0000-0000-000000000051',
          organization_id: org.id,
          host_id: desktopHost.id,
          process_id: chromeProcess.id,
          type: 'security',
          severity: 'high',
          title: 'Suspicious Connection Detected',
          description: 'Connection to known malicious IP detected and blocked',
          status: 'active',
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
        {
          id: '00000000-0000-0000-0000-000000000052',
          organization_id: org.id,
          host_id: desktopHost.id,
          process_id: chromeProcess.id,
          type: 'bandwidth',
          severity: 'medium',
          title: 'High Bandwidth Usage',
          description: 'Unusual bandwidth consumption detected on this device',
          status: 'active',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '00000000-0000-0000-0000-000000000053',
          organization_id: org.id,
          host_id: desktopHost.id,
          process_id: chromeProcess.id,
          type: 'anomaly',
          severity: 'low',
          title: 'New Process Started',
          description: 'A new process has started running on this device',
          status: 'resolved',
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        },
      ], { onConflict: 'id' });

    if (alertsError) {
      console.error('Error creating alerts:', alertsError);
      return;
    }
    console.log('✓ Alerts created');

    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

seedDatabase();
