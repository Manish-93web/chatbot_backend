const rateLimit = require('express-rate-limit');

// Standard API rate limiter: 500 requests per 15 minutes
const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

// Strict rate limiter for auth routes: 10 attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes'
    }
});

// Public widget limiter: 50 requests per minute (allows burst for initial load)
const widgetLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Rate limit exceeded for widget config'
    }
});

module.exports = {
    standardLimiter,
    authLimiter,
    widgetLimiter
};
