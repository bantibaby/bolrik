const IPTracker = require('../models/ipTracker');
const User = require('../models/user');

/**
 * Extract IP address from request
 * @param {Object} req - Express request object
 * @returns {String} IP address
 */
const getIpAddress = (req) => {
    return req.ip || 
           req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           '0.0.0.0';
};

/**
 * Track IP address for all requests
 */
const trackIp = async (req, res, next) => {
    try {
        const ip = getIpAddress(req);
        
        // Skip tracking for static resources
        if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$/i)) {
            return next();
        }
        
        // Find or create IP record
        const ipRecord = await IPTracker.findOneAndUpdate(
            { ipAddress: ip },
            { 
                $inc: { accessCount: 1 },
                lastAccessedAt: new Date()
            },
            { upsert: true, new: true }
        );
        
        // Store IP record in request for later use
        req.ipRecord = ipRecord;
        
        // If IP is blocked, deny access to sensitive routes
        if (ipRecord.isBlocked && isSensitiveRoute(req.path)) {
            return res.status(403).render('blockedIp', {
                reason: ipRecord.blockReason || 'Multiple accounts detected from this IP address'
            });
        }
        
        next();
    } catch (error) {
        console.error('IP tracking error:', error);
        next(); // Continue even if tracking fails
    }
};

/**
 * Check if a route is sensitive (registration, login, etc.)
 */
const isSensitiveRoute = (path) => {
    const sensitiveRoutes = [
        '/user/register', 
        '/user/login',
        '/user/deposit',
        '/user/withdraw'
    ];
    
    return sensitiveRoutes.some(route => path.startsWith(route));
};

/**
 * Check for multiple accounts from same IP during registration
 */
const checkMultipleAccounts = async (req, res, next) => {
    try {
        const ip = getIpAddress(req);
        
        // Find IP record
        const ipRecord = await IPTracker.findOne({ ipAddress: ip });
        
        // If no record or no users linked yet, allow registration
        if (!ipRecord || ipRecord.userIds.length === 0) {
            return next();
        }
        
        // If IP already has multiple accounts, block registration
        if (ipRecord.userIds.length >= 3) {
            // Update IP record to blocked status
            ipRecord.isBlocked = true;
            ipRecord.blockReason = 'Too many accounts created from this IP address';
            await ipRecord.save();
            
            return res.status(403).render('blockedIp', {
                reason: 'Too many accounts created from this IP address'
            });
        }
        
        // If IP has 1-2 accounts, allow but flag for no bonus
        req.noWelcomeBonus = true;
        req.multipleAccountsIP = true;
        
        next();
    } catch (error) {
        console.error('IP multiple account check error:', error);
        next(); // Continue even if check fails
    }
};

/**
 * Link user to IP address after successful registration or login
 */
const linkUserToIp = async (userId, req) => {
    try {
        const ip = getIpAddress(req);
        
        // Find IP record
        let ipRecord = await IPTracker.findOne({ ipAddress: ip });
        
        if (!ipRecord) {
            // Create new IP record if not exists
            ipRecord = new IPTracker({
                ipAddress: ip,
                userIds: [userId],
                firstUserId: userId,
                firstUserRegisteredAt: new Date()
            });
        } else {
            // Add user to existing IP record if not already present
            if (!ipRecord.userIds.includes(userId)) {
                ipRecord.userIds.push(userId);
            }
            
            // Set first user if not already set
            if (!ipRecord.firstUserId) {
                ipRecord.firstUserId = userId;
                ipRecord.firstUserRegisteredAt = new Date();
            }
        }
        
        await ipRecord.save();
        return ipRecord;
    } catch (error) {
        console.error('Error linking user to IP:', error);
        return null;
    }
};

module.exports = {
    trackIp,
    checkMultipleAccounts,
    linkUserToIp,
    getIpAddress
}; 