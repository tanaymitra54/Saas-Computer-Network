// Network Data Collection Edge Function
// Copyright by github.com/odaysec

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessData {
  pid: number
  name: string
  path?: string
  command_line?: string
  user_name?: string
  cpu_percent?: number
  memory_mb?: number
  started_at?: string
  hash_sha256?: string
}

interface ConnectionData {
  process_pid: number
  local_ip: string
  local_port: number
  remote_ip: string
  remote_port: number
  protocol: string
  state: string
  bytes_sent?: number
  bytes_received?: number
  packets_sent?: number
  packets_received?: number
  domain_name?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { host_id, api_key, data_type, data } = await req.json()

    // Authenticate agent
    const { data: host, error: authError } = await supabase
      .from('hosts')
      .select('agent_config, organization_id')
      .eq('id', host_id)
      .single()

    if (authError || !host || host.agent_config?.api_key !== api_key) {
      throw new Error('Invalid authentication')
    }

    switch (data_type) {
      case 'processes':
        return await updateProcesses(supabase, host_id, data)
      case 'connections':
        return await updateConnections(supabase, host_id, data)
      case 'network_stats':
        return await updateNetworkStats(supabase, host_id, data)
      default:
        throw new Error('Invalid data type')
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function updateProcesses(supabase: any, host_id: string, processes: ProcessData[]) {
  const processUpserts = processes.map(proc => ({
    host_id,
    pid: proc.pid,
    name: proc.name,
    path: proc.path,
    command_line: proc.command_line,
    user_name: proc.user_name,
    cpu_percent: proc.cpu_percent || 0,
    memory_mb: proc.memory_mb || 0,
    started_at: proc.started_at,
    hash_sha256: proc.hash_sha256,
    updated_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('processes')
    .upsert(processUpserts, {
      onConflict: 'host_id,pid'
    })
    .select()

  if (error) {
    throw new Error('Failed to update processes: ' + error.message)
  }

  return new Response(
    JSON.stringify({ success: true, updated: data.length }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function updateConnections(supabase: any, host_id: string, connections: ConnectionData[]) {
  // First, get process IDs for the PIDs
  const pids = [...new Set(connections.map(c => c.process_pid))]
  const { data: processes } = await supabase
    .from('processes')
    .select('id, pid')
    .eq('host_id', host_id)
    .in('pid', pids)

  const pidToProcessId = new Map(processes?.map(p => [p.pid, p.id]) || [])

  const connectionUpserts = connections
    .filter(conn => pidToProcessId.has(conn.process_pid))
    .map(conn => ({
      host_id,
      process_id: pidToProcessId.get(conn.process_pid),
      local_ip: conn.local_ip,
      local_port: conn.local_port,
      remote_ip: conn.remote_ip,
      remote_port: conn.remote_port,
      protocol: conn.protocol,
      state: conn.state,
      bytes_sent: conn.bytes_sent || 0,
      bytes_received: conn.bytes_received || 0,
      packets_sent: conn.packets_sent || 0,
      packets_received: conn.packets_received || 0,
      domain_name: conn.domain_name,
      updated_at: new Date().toISOString()
    }))

  // Check for suspicious connections and create alerts
  for (const conn of connectionUpserts) {
    await checkForSecurityAlerts(supabase, host_id, conn)
  }

  const { data, error } = await supabase
    .from('connections')
    .upsert(connectionUpserts, {
      onConflict: 'host_id,process_id,remote_ip,remote_port'
    })
    .select()

  if (error) {
    throw new Error('Failed to update connections: ' + error.message)
  }

  return new Response(
    JSON.stringify({ success: true, updated: data.length }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function updateNetworkStats(supabase: any, host_id: string, stats: any) {
  const { data, error } = await supabase
    .from('network_stats')
    .insert({
      host_id,
      bytes_in: stats.bytes_in || 0,
      bytes_out: stats.bytes_out || 0,
      packets_in: stats.packets_in || 0,
      packets_out: stats.packets_out || 0,
      connections_count: stats.connections_count || 0,
      period: '1m'
    })
    .select()

  if (error) {
    throw new Error('Failed to insert network stats: ' + error.message)
  }

  return new Response(
    JSON.stringify({ success: true }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function checkForSecurityAlerts(supabase: any, host_id: string, connection: any) {
  // Get host organization
  const { data: host } = await supabase
    .from('hosts')
    .select('organization_id')
    .eq('id', host_id)
    .single()

  if (!host) return

  // Check for suspicious IPs (example: connections to known bad ranges)
  const suspiciousRanges = ['185.199.108.0/24', '192.168.1.0/24'] // Example ranges
  const remoteIp = connection.remote_ip

  // Simple check - in production, use proper IP range checking
  const isSuspicious = suspiciousRanges.some(range => {
    // Basic check - implement proper CIDR checking in production
    return remoteIp.startsWith(range.split('/')[0].split('.').slice(0, 3).join('.'))
  })

  if (isSuspicious) {
    await supabase
      .from('alerts')
      .insert({
        organization_id: host.organization_id,
        host_id,
        process_id: connection.process_id,
        connection_id: null, // Will be set after connection is created
        type: 'security',
        severity: 'high',
        title: 'Suspicious Connection Detected',
        description: `Connection to potentially malicious IP: ${remoteIp}:${connection.remote_port}`,
        metadata: {
          remote_ip: remoteIp,
          remote_port: connection.remote_port,
          protocol: connection.protocol
        }
      })
  }

  // Check for high bandwidth usage
  const totalBytes = (connection.bytes_sent || 0) + (connection.bytes_received || 0)
  if (totalBytes > 100 * 1024 * 1024) { // 100MB threshold
    await supabase
      .from('alerts')
      .insert({
        organization_id: host.organization_id,
        host_id,
        process_id: connection.process_id,
        type: 'bandwidth',
        severity: 'medium',
        title: 'High Bandwidth Usage Detected',
        description: `Process consuming ${(totalBytes / (1024 * 1024)).toFixed(1)}MB bandwidth`,
        metadata: {
          bytes_total: totalBytes,
          remote_ip: remoteIp
        }
      })
  }
}