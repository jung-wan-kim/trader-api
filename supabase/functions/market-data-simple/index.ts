// 간단한 market-data Edge Function (인증 없이)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // OPTIONS 요청 처리 (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, symbol } = await req.json()
    
    // Finnhub API 키
    const finnhubApiKey = 'd11du61r01qu0d0fu8v0d11du61r01qu0d0fu8vg'
    
    if (action === 'quote') {
      // Finnhub API 호출
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
      )
      
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return new Response(
        JSON.stringify({ 
          data,
          cached: false,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }
    
    throw new Error(`Unknown action: ${action}`)
    
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})