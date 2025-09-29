-- Insert sample data for testing

-- Create admin user organization (will be created automatically by trigger)
-- But we can insert some sample hosts and data after user signup

-- Sample host data (your home network devices)
-- This will be inserted after you create your admin account

-- Sample alert types that might occur in home network monitoring
INSERT INTO alerts (organization_id, host_id, type, severity, title, description, status) 
SELECT 
  o.id as organization_id,
  h.id as host_id,
  'security' as type,
  'medium' as severity,
  'Unknown Device Connected' as title,
  'A new device has connected to your home network' as description,
  'active' as status
FROM organizations o, hosts h 
WHERE o.owner_id IN (SELECT id FROM auth.users LIMIT 1)
  AND h.organization_id = o.id
  AND EXISTS (SELECT 1 FROM auth.users)
LIMIT 1;

-- Function to generate sample data for a user's organization
CREATE OR REPLACE FUNCTION generate_sample_data_for_user(user_id uuid)
RETURNS void AS $$
DECLARE
  org_id uuid;
  host_id uuid;
  process_id uuid;
BEGIN
  -- Get user's organization
  SELECT id INTO org_id FROM organizations WHERE owner_id = user_id;
  
  IF org_id IS NOT NULL THEN
    -- Insert sample hosts (typical home network devices)
    INSERT INTO hosts (organization_id, hostname, os_type, os_version, ip_address, mac_address, status)
    VALUES 
      (org_id, 'Home-Router', 'Linux', 'OpenWrt 21.02', '192.168.1.1', '00:11:22:33:44:55', 'online'),
      (org_id, 'Desktop-PC', 'Windows', 'Windows 11', '192.168.1.100', '00:11:22:33:44:56', 'online'),
      (org_id, 'Smartphone', 'Android', 'Android 13', '192.168.1.101', '00:11:22:33:44:57', 'online'),
      (org_id, 'Smart-TV', 'Android TV', 'Android TV 11', '192.168.1.102', '00:11:22:33:44:58', 'online')
    RETURNING id INTO host_id;

    -- Insert sample processes for Desktop-PC
    SELECT id INTO host_id FROM hosts WHERE hostname = 'Desktop-PC' AND organization_id = org_id;
    
    IF host_id IS NOT NULL THEN
      INSERT INTO processes (host_id, pid, name, path, user_name, cpu_percent, memory_mb, status)
      VALUES 
        (host_id, 1234, 'chrome.exe', 'C:\Program Files\Google\Chrome\Application\chrome.exe', 'Admin', 15.5, 512.0, 'running'),
        (host_id, 5678, 'discord.exe', 'C:\Users\Admin\AppData\Local\Discord\app-1.0.9003\Discord.exe', 'Admin', 5.2, 256.0, 'running'),
        (host_id, 9012, 'code.exe', 'C:\Users\Admin\AppData\Local\Programs\Microsoft VS Code\Code.exe', 'Admin', 8.1, 384.0, 'running')
      RETURNING id INTO process_id;

      -- Insert sample connections
      INSERT INTO connections (host_id, process_id, local_ip, local_port, remote_ip, remote_port, protocol, state, bytes_sent, bytes_received, country_code)
      VALUES 
        (host_id, process_id, '192.168.1.100', 52341, '142.250.191.14', 443, 'TCP', 'ESTABLISHED', 1024, 8192, 'US'),
        (host_id, process_id, '192.168.1.100', 52342, '162.159.130.234', 443, 'TCP', 'ESTABLISHED', 512, 2048, 'US');

      -- Insert sample network stats
      INSERT INTO network_stats (host_id, process_id, bytes_in, bytes_out, packets_in, packets_out, connections_count, period)
      VALUES 
        (host_id, process_id, 1048576, 524288, 1000, 800, 5, '1m'),
        (host_id, process_id, 2097152, 1048576, 2000, 1600, 8, '5m');
    END IF;

    -- Insert sample alerts
    INSERT INTO alerts (organization_id, host_id, type, severity, title, description, status)
    VALUES 
      (org_id, host_id, 'security', 'high', 'Suspicious Connection Detected', 'Connection to known malicious IP detected and blocked', 'active'),
      (org_id, host_id, 'bandwidth', 'medium', 'High Bandwidth Usage', 'Unusual bandwidth consumption detected on this device', 'active'),
      (org_id, host_id, 'anomaly', 'low', 'New Process Started', 'A new process has started running on this device', 'resolved');
  END IF;
END;
$$ LANGUAGE plpgsql;