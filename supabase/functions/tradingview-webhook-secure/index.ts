import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { createHash } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
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

// Verify webhook secret
function verifyWebhookSecret(secret: string | null, expectedSecret: string | null): boolean {
  if (!expectedSecret) {
    console.warn('No webhook secret configured - accepting all requests')
    return true
  }
  
  if (!secret) {
    console.error('No webhook secret provided in request')
    return false
  }
  
  return secret === expectedSecret
}

// Rate limiting using in-memory store (for simple implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now()
  const record = requestCounts.get(identifier)
  
  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
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

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const webhookSecret = Deno.env.get('TRADINGVIEW_WEBHOOK_SECRET')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables')
    }

    // Verify webhook secret
    const providedSecret = req.headers.get('X-Webhook-Secret')
    if (!verifyWebhookSecret(providedSecret, webhookSecret)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get client IP for rate limiting
    const clientIp = req.headers.get('X-Forwarded-For')?.split(',')[0] || 
                     req.headers.get('CF-Connecting-IP') || 
                     'unknown'

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
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

    // Validate data types and ranges
    if (typeof webhookData.price !== 'number' || webhookData.price <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid price value' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (typeof webhookData.volume !== 'number' || webhookData.volume < 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid volume value' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate action
    const validActions = ['buy', 'sell', 'hold', 'close']
    if (!validActions.includes(webhookData.action.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
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

    // Check if webhook time is not too old (prevent replay attacks)
    const timeDiff = Date.now() - webhookTime.getTime()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    if (Math.abs(timeDiff) > maxAge) {
      return new Response(
        JSON.stringify({ error: 'Webhook timestamp too old or in the future' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Sanitize symbol to prevent injection
    const sanitizedSymbol = webhookData.symbol.replace(/[^A-Za-z0-9\-\.]/g, '').toUpperCase()

    // Prepare data for insertion
    const insertData = {
      symbol: sanitizedSymbol,
      action: webhookData.action.toLowerCase(),
      price: parseFloat(webhookData.price.toString()),
      volume: parseInt(webhookData.volume.toString()),
      text: webhookData.text?.substring(0, 500) || null, // Limit text length
      webhook_time: webhookTime.toISOString(),
      strategy: webhookData.strategy.substring(0, 100), // Limit strategy name length
      timeframe: webhookData.timeframe.substring(0, 20), // Limit timeframe length
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
        JSON.stringify({ error: 'Failed to save webhook data' }),
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
    
    // Don't expose internal errors
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})