import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PortfolioRequest {
  action: 'create_position' | 'close_position' | 'calculate_performance' | 'rebalance'
  portfolioId?: string
  positionId?: string
  data?: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Authenticate user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    const request = await req.json() as PortfolioRequest

    let result: any

    switch (request.action) {
      case 'create_position':
        result = await createPosition(supabaseClient, user.id, request.portfolioId!, request.data)
        break
      
      case 'close_position':
        result = await closePosition(supabaseClient, user.id, request.positionId!)
        break
      
      case 'calculate_performance':
        result = await calculatePortfolioPerformance(supabaseClient, user.id, request.portfolioId!)
        break
      
      case 'rebalance':
        result = await rebalancePortfolio(supabaseClient, user.id, request.portfolioId!)
        break
      
      default:
        throw new Error('Invalid action')
    }

    // Log activity
    await supabaseClient.rpc('log_activity', {
      action_type: `portfolio_${request.action}`,
      metadata: { portfolioId: request.portfolioId, result: result.success }
    })

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
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

async function createPosition(supabaseClient: any, userId: string, portfolioId: string, positionData: any) {
  // Verify portfolio ownership
  const { data: portfolio } = await supabaseClient
    .from('portfolios')
    .select('id, initial_capital')
    .eq('id', portfolioId)
    .eq('user_id', userId)
    .single()

  if (!portfolio) {
    throw new Error('Portfolio not found')
  }

  // Get current positions to check risk
  const { data: existingPositions } = await supabaseClient
    .from('positions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .eq('status', 'open')

  // Calculate current exposure
  let totalExposure = 0
  if (existingPositions) {
    totalExposure = existingPositions.reduce((sum: number, pos: any) => {
      return sum + (pos.entry_price * pos.quantity)
    }, 0)
  }

  // Calculate new position size
  const positionSize = positionData.entry_price * positionData.quantity
  const newTotalExposure = totalExposure + positionSize

  // Risk management: Max 10% per position, max 100% total exposure
  const maxPositionSize = portfolio.initial_capital * 0.1
  const maxTotalExposure = portfolio.initial_capital

  if (positionSize > maxPositionSize) {
    throw new Error(`Position size exceeds maximum allowed (10% of capital). Max: $${maxPositionSize.toFixed(2)}`)
  }

  if (newTotalExposure > maxTotalExposure) {
    throw new Error(`Total exposure would exceed portfolio capital. Available: $${(maxTotalExposure - totalExposure).toFixed(2)}`)
  }

  // Calculate stop loss and take profit if not provided
  if (!positionData.stop_loss) {
    positionData.stop_loss = positionData.side === 'long' 
      ? positionData.entry_price * 0.95  // 5% stop loss
      : positionData.entry_price * 1.05
  }

  if (!positionData.take_profit) {
    positionData.take_profit = positionData.side === 'long'
      ? positionData.entry_price * 1.15  // 15% take profit
      : positionData.entry_price * 0.85
  }

  // Create the position
  const { data: newPosition, error } = await supabaseClient
    .from('positions')
    .insert({
      portfolio_id: portfolioId,
      ...positionData,
      status: 'open',
      opened_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  // Fetch current market price to calculate unrealized P&L
  const marketDataResponse = await supabaseClient.functions.invoke('market-data', {
    body: {
      action: 'quote',
      symbol: positionData.symbol
    }
  })

  const currentPrice = marketDataResponse.data?.data?.c || positionData.entry_price
  const unrealizedPnL = calculatePnL(positionData, currentPrice)

  return {
    success: true,
    position: {
      ...newPosition,
      current_price: currentPrice,
      unrealized_pnl: unrealizedPnL
    }
  }
}

async function closePosition(supabaseClient: any, userId: string, positionId: string) {
  // Get position with portfolio info
  const { data: position } = await supabaseClient
    .from('positions')
    .select('*, portfolios!inner(user_id)')
    .eq('id', positionId)
    .eq('portfolios.user_id', userId)
    .eq('status', 'open')
    .single()

  if (!position) {
    throw new Error('Position not found or already closed')
  }

  // Fetch current market price
  const marketDataResponse = await supabaseClient.functions.invoke('market-data', {
    body: {
      action: 'quote',
      symbol: position.symbol
    }
  })

  const exitPrice = marketDataResponse.data?.data?.c
  if (!exitPrice) {
    throw new Error('Unable to fetch current market price')
  }

  // Calculate realized P&L
  const realizedPnL = calculatePnL(position, exitPrice)
  const commission = (position.entry_price * position.quantity + exitPrice * position.quantity) * 0.001 // 0.1% commission

  // Update position
  const { error } = await supabaseClient
    .from('positions')
    .update({
      exit_price: exitPrice,
      status: 'closed',
      closed_at: new Date().toISOString(),
      realized_pnl: realizedPnL - commission,
      commission: commission
    })
    .eq('id', positionId)

  if (error) {
    throw error
  }

  return {
    success: true,
    exit_price: exitPrice,
    realized_pnl: realizedPnL - commission,
    commission: commission
  }
}

async function calculatePortfolioPerformance(supabaseClient: any, userId: string, portfolioId: string) {
  // Verify portfolio ownership
  const { data: portfolio } = await supabaseClient
    .from('portfolios')
    .select('*')
    .eq('id', portfolioId)
    .eq('user_id', userId)
    .single()

  if (!portfolio) {
    throw new Error('Portfolio not found')
  }

  // Get all positions
  const { data: positions } = await supabaseClient
    .from('positions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('opened_at', { ascending: true })

  if (!positions || positions.length === 0) {
    return {
      success: true,
      performance: {
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0,
        total_pnl: 0,
        realized_pnl: 0,
        unrealized_pnl: 0,
        current_value: portfolio.initial_capital,
        total_return: 0,
        sharpe_ratio: 0,
        max_drawdown: 0,
        average_win: 0,
        average_loss: 0,
        profit_factor: 0
      }
    }
  }

  // Separate open and closed positions
  const closedPositions = positions.filter(p => p.status === 'closed')
  const openPositions = positions.filter(p => p.status === 'open')

  // Calculate metrics for closed positions
  let totalWins = 0
  let totalLosses = 0
  let winningTrades = 0
  let losingTrades = 0

  closedPositions.forEach(position => {
    if (position.realized_pnl > 0) {
      totalWins += position.realized_pnl
      winningTrades++
    } else if (position.realized_pnl < 0) {
      totalLosses += Math.abs(position.realized_pnl)
      losingTrades++
    }
  })

  // Calculate unrealized P&L for open positions
  let unrealizedPnL = 0
  const openPositionsWithPnL = []

  for (const position of openPositions) {
    const marketDataResponse = await supabaseClient.functions.invoke('market-data', {
      body: {
        action: 'quote',
        symbol: position.symbol
      }
    })

    const currentPrice = marketDataResponse.data?.data?.c || position.entry_price
    const pnl = calculatePnL(position, currentPrice)
    unrealizedPnL += pnl

    openPositionsWithPnL.push({
      ...position,
      current_price: currentPrice,
      unrealized_pnl: pnl
    })
  }

  const realizedPnL = closedPositions.reduce((sum, p) => sum + (p.realized_pnl || 0), 0)
  const totalPnL = realizedPnL + unrealizedPnL
  const currentValue = portfolio.initial_capital + totalPnL
  const totalReturn = (totalPnL / portfolio.initial_capital) * 100

  // Calculate win rate
  const totalTrades = closedPositions.length
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

  // Calculate average win/loss
  const averageWin = winningTrades > 0 ? totalWins / winningTrades : 0
  const averageLoss = losingTrades > 0 ? totalLosses / losingTrades : 0

  // Calculate profit factor
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0

  // Calculate max drawdown (simplified)
  let peak = portfolio.initial_capital
  let maxDrawdown = 0
  let runningCapital = portfolio.initial_capital

  closedPositions.forEach(position => {
    runningCapital += position.realized_pnl || 0
    if (runningCapital > peak) {
      peak = runningCapital
    }
    const drawdown = ((peak - runningCapital) / peak) * 100
    maxDrawdown = Math.max(maxDrawdown, drawdown)
  })

  // Calculate Sharpe Ratio (simplified - annualized)
  const returns: number[] = []
  closedPositions.forEach(position => {
    if (position.closed_at && position.opened_at) {
      const holdingDays = (new Date(position.closed_at).getTime() - new Date(position.opened_at).getTime()) / (1000 * 60 * 60 * 24)
      const dailyReturn = (position.realized_pnl || 0) / (position.entry_price * position.quantity) / holdingDays
      returns.push(dailyReturn)
    }
  })

  let sharpeRatio = 0
  if (returns.length > 1) {
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    sharpeRatio = stdDev > 0 ? (avgReturn * 252) / (stdDev * Math.sqrt(252)) : 0 // Annualized
  }

  return {
    success: true,
    performance: {
      total_trades: totalTrades,
      open_positions: openPositions.length,
      winning_trades: winningTrades,
      losing_trades: losingTrades,
      win_rate: winRate,
      total_pnl: totalPnL,
      realized_pnl: realizedPnL,
      unrealized_pnl: unrealizedPnL,
      current_value: currentValue,
      total_return: totalReturn,
      sharpe_ratio: sharpeRatio,
      max_drawdown: maxDrawdown,
      average_win: averageWin,
      average_loss: averageLoss,
      profit_factor: profitFactor,
      open_positions_detail: openPositionsWithPnL
    }
  }
}

async function rebalancePortfolio(supabaseClient: any, userId: string, portfolioId: string) {
  // This is a placeholder for portfolio rebalancing logic
  // In a real implementation, this would:
  // 1. Analyze current positions vs target allocations
  // 2. Generate rebalancing orders
  // 3. Consider tax implications
  // 4. Minimize transaction costs

  const { data: portfolio } = await supabaseClient
    .from('portfolios')
    .select('*')
    .eq('id', portfolioId)
    .eq('user_id', userId)
    .single()

  if (!portfolio) {
    throw new Error('Portfolio not found')
  }

  // Get current positions
  const { data: positions } = await supabaseClient
    .from('positions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .eq('status', 'open')

  // Simple rebalancing: Equal weight across all positions
  const targetAllocation = 1 / (positions?.length || 1)
  const recommendations = []

  if (positions) {
    for (const position of positions) {
      const currentWeight = (position.entry_price * position.quantity) / portfolio.initial_capital
      const targetWeight = targetAllocation
      const adjustment = targetWeight - currentWeight

      if (Math.abs(adjustment) > 0.05) { // Only rebalance if difference > 5%
        recommendations.push({
          symbol: position.symbol,
          current_weight: currentWeight,
          target_weight: targetWeight,
          action: adjustment > 0 ? 'buy' : 'sell',
          adjustment_percent: adjustment * 100
        })
      }
    }
  }

  return {
    success: true,
    rebalancing_recommendations: recommendations
  }
}

function calculatePnL(position: any, currentPrice: number): number {
  if (position.side === 'long') {
    return (currentPrice - position.entry_price) * position.quantity
  } else {
    return (position.entry_price - currentPrice) * position.quantity
  }
}