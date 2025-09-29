import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get user from auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { hostname, os_type, os_version, ip_address, mac_address, agent_version } = await req.json()

    if (!hostname || !os_type) {
      return new Response(
        JSON.stringify({ error: 'Hostname and OS type are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'User organization not found' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if host already exists
    const { data: existingHost } = await supabase
      .from('hosts')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('hostname', hostname)
      .single()

    let host_id

    if (existingHost) {
      // Update existing host
      const { data: updatedHost, error: updateError } = await supabase
        .from('hosts')
        .update({
          os_version,
          ip_address,
          mac_address,
          agent_version,
          last_seen: new Date().toISOString(),
          status: 'online'
        })
        .eq('id', existingHost.id)
        .select('id')
        .single()

      if (updateError) {
        console.error('Update error:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update host' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      host_id = updatedHost.id
    } else {
      // Create new host
      const { data: newHost, error: insertError } = await supabase
        .from('hosts')
        .insert({
          organization_id: profile.organization_id,
          hostname,
          os_type,
          os_version,
          ip_address,
          mac_address,
          agent_version,
          last_seen: new Date().toISOString(),
          status: 'online'
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create host' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      host_id = newHost.id

      // Create welcome alert for new host
      await supabase
        .from('alerts')
        .insert({
          organization_id: profile.organization_id,
          host_id: host_id,
          type: 'security',
          severity: 'low',
          title: `New Host Connected: ${hostname}`,
          description: `A new ${os_type} device "${hostname}" has been registered for monitoring.`,
          status: 'active'
        })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        host_id: host_id,
        message: `Host ${hostname} registered successfully`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})