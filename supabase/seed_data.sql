-- First, create a test user if one doesn't exist
DO $$
DECLARE
  test_user_id uuid;
  org_id uuid;
  host_id uuid;
  process_id uuid;
BEGIN
  -- Check if test user exists, if not create one
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test@example.com') THEN
    test_user_id := gen_random_uuid();
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, 
      email_confirmed_at, recovery_sent_at, last_sign_in_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
      confirmation_token, email_change, email_change_token_new, 
      recovery_token
    ) VALUES (
      test_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 
      'authenticated', 'test@example.com', 
      '$2a$10$dXq3t1NU1ZbCkLrL1qXm6u5y5z9aX8vJZ8XvJZ8XvJZ8XvJZ8XvJZ', 
      now(), now(), now(), 
      '{"provider":"email","providers":["email"]}', '{}', now(), now(),
      '', '', '', ''
    );
    
    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), 
      test_user_id, 
      jsonb_build_object(
        'sub', test_user_id::text,
        'email', 'test@example.com'
      ),
      'email', 
      'test@example.com',
      now(), 
      now(), 
      now()
    );
  ELSE
    -- If multiple users exist with this email, just take the first one
    SELECT id INTO test_user_id FROM auth.users 
    WHERE email = 'test@example.com' 
    LIMIT 1;
  END IF;
  
  -- Create organization for the test user if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE owner_id = test_user_id) THEN
    INSERT INTO organizations (name, owner_id)
    VALUES ('My Home Network', test_user_id)
    RETURNING id INTO org_id;
  ELSE
    -- If multiple organizations exist for this user, just take the first one
    SELECT id INTO org_id FROM organizations 
    WHERE owner_id = test_user_id
    LIMIT 1;
  END IF;
  
  -- Insert sample hosts (typical home network devices)
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE organization_id = org_id LIMIT 1) THEN
    INSERT INTO hosts (organization_id, hostname, os_type, os_version, ip_address, mac_address, status, last_seen)
    VALUES 
      (org_id, 'Home-Router', 'Linux', 'OpenWrt 21.02', '192.168.1.1', '00:11:22:33:44:55', 'online', now()),
      (org_id, 'Desktop-PC', 'Windows', 'Windows 11', '192.168.1.100', '00:11:22:33:44:56', 'online', now()),
      (org_id, 'Smartphone', 'Android', 'Android 13', '192.168.1.101', '00:11:22:33:44:57', 'online', now()),
      (org_id, 'Smart-TV', 'Android TV', 'Android TV 11', '192.168.1.102', '00:11:22:33:44:58', 'online', now())
    RETURNING id INTO host_id;
  END IF;
  
  -- Get the Desktop-PC host ID, ensure only one row is returned
  SELECT id INTO host_id FROM hosts 
  WHERE hostname = 'Desktop-PC' AND organization_id = org_id 
  LIMIT 1;
  
  -- Insert sample processes for Desktop-PC
  IF host_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM processes p WHERE p.host_id = host_id LIMIT 1) THEN
    INSERT INTO processes (host_id, pid, name, path, user_name, cpu_percent, memory_mb, status, started_at)
    VALUES 
      (host_id, 1234, 'chrome.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'Admin', 15.5, 512.0, 'running', now()),
      (host_id, 5678, 'discord.exe', 'C:\\Users\\Admin\\AppData\\Local\\Discord\\app-1.0.9003\\Discord.exe', 'Admin', 5.2, 256.0, 'running', now()),
      (host_id, 9012, 'code.exe', 'C:\\Users\\Admin\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe', 'Admin', 8.1, 384.0, 'running', now());
  END IF;
  
  -- Get one of the processes for this host
  SELECT p.id INTO process_id FROM processes p
  WHERE p.host_id = host_id 
  ORDER BY p.started_at DESC
  LIMIT 1;
  
  -- Insert sample connections
  IF process_id IS NOT NULL THEN
    INSERT INTO connections (host_id, process_id, local_ip, local_port, remote_ip, remote_port, protocol, state, 
                           bytes_sent, bytes_received, packets_sent, packets_received, connection_start, country_code, is_blocked)
    VALUES 
      (host_id, process_id, '192.168.1.100', 52341, '142.250.191.14', 443, 'TCP', 'ESTABLISHED', 
       1024, 8192, 100, 80, now() - interval '5 minutes', 'US', false),
      (host_id, process_id, '192.168.1.100', 52342, '162.159.130.234', 443, 'TCP', 'ESTABLISHED', 
       512, 2048, 50, 40, now() - interval '10 minutes', 'US', false);
    
    -- Insert sample network stats if they don't exist
    IF NOT EXISTS (SELECT 1 FROM network_stats ns WHERE ns.host_id = host_id LIMIT 1) THEN
      INSERT INTO network_stats (host_id, process_id, bytes_in, bytes_out, packets_in, packets_out, connections_count, period, timestamp)
      VALUES 
        (host_id, process_id, 1048576, 524288, 1000, 800, 5, '1m', now() - interval '5 minutes'),
        (host_id, process_id, 2097152, 1048576, 2000, 1600, 8, '5m', now() - interval '10 minutes');
    END IF;
    
    -- Insert sample alerts if they don't exist
    IF NOT EXISTS (SELECT 1 FROM alerts a WHERE a.host_id = host_id LIMIT 1) THEN
      INSERT INTO alerts (organization_id, host_id, process_id, type, severity, title, description, status, created_at)
      VALUES 
        (org_id, host_id, process_id, 'security', 'high', 'Suspicious Connection Detected', 
         'Connection to known malicious IP detected and blocked', 'active', now() - interval '1 hour'),
        (org_id, host_id, process_id, 'bandwidth', 'medium', 'High Bandwidth Usage', 
         'Unusual bandwidth consumption detected on this device', 'active', now() - interval '2 hours'),
        (org_id, host_id, process_id, 'anomaly', 'low', 'New Process Started', 
         'A new process has started running on this device', 'resolved', now() - interval '3 hours');
    END IF;
  END IF;
  
  RAISE NOTICE 'Sample data has been inserted successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error inserting sample data: %', SQLERRM;
END $$;
