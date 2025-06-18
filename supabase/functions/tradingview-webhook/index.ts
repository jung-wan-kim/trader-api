import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TradingViewWebhook {
  symbol: string
  action: string
  price: number
  volume: number
  text?: string
  time: string
  strategy: string
  timeframe: string
  indicators: {
    macd?: number
    wr?: number
    [key: string]: any
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get webhook secret from URL parameters for TradingView compatibility
    const url = new URL(req.url)
    const webhookSecret = url.searchParams.get('secret')
    const expectedSecret = Deno.env.get('TRADINGVIEW_WEBHOOK_SECRET')
    
    // Validate webhook secret
    if (!expectedSecret || webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret:', webhookSecret ? 'mismatch' : 'missing')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables')
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the webhook data
    const webhookData: TradingViewWebhook = await req.json()
    
    // Validate required fields
    const requiredFields = ['symbol', 'action', 'price', 'volume', 'time', 'strategy', 'timeframe']
    for (const field of requiredFields) {
      if (!webhookData[field as keyof TradingViewWebhook]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Convert time string to timestamp
    const webhookTime = new Date(webhookData.time)
    if (isNaN(webhookTime.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid time format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare data for insertion
    const insertData = {
      symbol: webhookData.symbol,
      action: webhookData.action.toLowerCase(),
      price: parseFloat(webhookData.price.toString()),
      volume: parseInt(webhookData.volume.toString()),
      text: webhookData.text || null,
      webhook_time: webhookTime.toISOString(),
      strategy: webhookData.strategy,
      timeframe: webhookData.timeframe,
      indicators: webhookData.indicators || {},
      raw_data: webhookData
    }

    // Insert into database
    const { data, error } = await supabase
      .from('tradingview_webhooks')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to save webhook data', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log successful webhook
    console.log(`Webhook saved: ${data.id} - ${data.symbol} ${data.action} @ ${data.price}`)

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook data saved successfully',
        id: data.id,
        timestamp: data.created_at
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})