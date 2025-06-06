import { verifySession, supabaseAdmin } from '../config/supabase.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify session with Supabase
    const user = await verifySession(token);
    
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Get user's subscription info from database
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*, subscriptions(*)')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      // Create profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          subscription_tier: 'basic'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to create user profile'
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        ...newProfile
      };
    } else {
      req.user = {
        id: user.id,
        email: user.email,
        ...profile
      };
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
};

export const authorize = (...requiredTiers) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userTier = req.user.subscription_tier || 'basic';
    const tierHierarchy = {
      basic: 0,
      premium: 1,
      professional: 2
    };

    const userTierLevel = tierHierarchy[userTier] || 0;
    const requiredLevel = Math.min(...requiredTiers.map(tier => tierHierarchy[tier] || 0));

    if (userTierLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This feature requires ${requiredTiers.join(' or ')} subscription`
      });
    }

    next();
  };
};

// Rate limiting by subscription tier
export const tierRateLimit = (req, res, next) => {
  const tier = req.user?.subscription_tier || 'basic';
  const limits = {
    basic: { requests: 100, window: '1h' },
    premium: { requests: 1000, window: '1h' },
    professional: { requests: 10000, window: '1h' }
  };

  // Store limit info in request for rate limiter middleware
  req.rateLimit = limits[tier];
  next();
};

export default { authenticate, authorize, tierRateLimit };