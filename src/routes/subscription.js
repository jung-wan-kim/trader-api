import express from 'express';
import * as subscriptionController from '../controllers/subscriptionController.js';
import { authenticate } from '../middleware/auth.js';
import { validateSubscription, validateUpgrade, validatePaymentMethod } from '../validators/subscription.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get subscription plans
router.get('/plans', subscriptionController.getPlans);

// Get current subscription
router.get('/current', subscriptionController.getCurrentSubscription);

// Create subscription
router.post('/subscribe', validateSubscription, subscriptionController.createSubscription);

// Upgrade subscription
router.post('/upgrade', validateUpgrade, subscriptionController.upgradeSubscription);

// Cancel subscription
router.post('/cancel', subscriptionController.cancelSubscription);

// Get subscription usage
router.get('/usage', subscriptionController.getUsage);

// Get subscription history
router.get('/history', subscriptionController.getSubscriptionHistory);

// Update payment method
router.put('/payment-method', validatePaymentMethod, subscriptionController.updatePaymentMethod);

export default router;