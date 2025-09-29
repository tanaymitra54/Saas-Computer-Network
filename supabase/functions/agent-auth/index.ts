// Agent Authentication Edge Function
// Copyright by github.com/odaysec

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, ...payload } = await req.json()

    switch (action) {
      case 'pair_agent':
        return await pairAgent(supabase, payload)
      case 'authenticate_agent':
        return await authenticateAgent(supabase, payload)
      case 'heartbeat':
        return await agentHeartbeat(supabase, payload)
      default:
        throw new Error('Invalid action')
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

async function pairAgent(supabase: any, { token, hostname, os_type, os_version, ip_address, mac_address }: any) {
  // Verify pairing token
  const { data: pairingToken, error: tokenError } = await supabase
    .from('pairing_tokens')
    .select('*')
    .eq('token', token)
    .eq('is_used', false)
    .single()

  if (tokenError || !pairingToken) {
    throw new Error('Invalid or expired pairing token')
  }

  // Check if token is expired
  if (new Date(pairingToken.expires_at) < new Date()) {
    throw new Error('Pairing token has expired')
  }

  // Create or update host
  const { data: host, error: hostError } = await supabase
    .from('hosts')
    .upsert({
      organization_id: pairingToken.organization_id,
      hostname,
      os_type,
      os_version,
      ip_address,
      mac_address,
      last_seen: new Date().toISOString(),
      status: 'online',
      agent_version: '1.0.0'
    }, {
      onConflict: 'hostname,organization_id'
    })
    .select()
    .single()

  if (hostError) {
    throw new Error('Failed to create host: ' + hostError.message)
  }

  // Mark token as used
  await supabase
    .from('pairing_tokens')
    .update({
      is_used: true,
      used_by_host: host.id
    })
    .eq('id', pairingToken.id)

  // Generate agent credentials
  const agentApiKey = crypto.randomUUID()
  
  // Store agent credentials (in production, use proper encryption)
  await supabase
    .from('hosts')
    .update({
      agent_config: {
        api_key: agentApiKey,
        paired_at: new Date().toISOString()
      }
    })
    .eq('id', host.id)

  return new Response(
    JSON.stringify({
      success: true,
      host_id: host.id,
      api_key: agentApiKey,
      websocket_url: `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'wss://')}/realtime/v1/websocket`
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function authenticateAgent(supabase: any, { host_id, api_key }: any) {
  const { data: host, error } = await supabase
    .from('hosts')
    .select('agent_config')
    .eq('id', host_id)
    .single()

  if (error || !host || host.agent_config?.api_key !== api_key) {
    throw new Error('Invalid authentication credentials')
  }

  return new Response(
    JSON.stringify({ success: true, authenticated: true }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function agentHeartbeat(supabase: any, { host_id, api_key, system_stats }: any) {
  // Authenticate first
  await authenticateAgent(supabase, { host_id, api_key })

  // Update last seen and system stats
  await supabase
    .from('hosts')
    .update({
      last_seen: new Date().toISOString(),
      status: 'online',
      agent_config: {
        ...system_stats,
        last_heartbeat: new Date().toISOString()
      }
    })
    .eq('id', host_id)

  return new Response(
    JSON.stringify({ success: true }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}