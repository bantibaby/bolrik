const useragent = require('express-useragent');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Create a schema for device fingerprints
const deviceFingerprintSchema = new mongoose.Schema({
    fingerprint: {
        type: String,
        required: true,
        unique: true
    },
    userIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    ipAddresses: [{
        type: String
    }],
    userAgents: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create the model if it doesn't exist
let DeviceFingerprint;
try {
    DeviceFingerprint = mongoose.model('DeviceFingerprint');
} catch (e) {
    DeviceFingerprint = mongoose.model('DeviceFingerprint', deviceFingerprintSchema);
}

// Generate a fingerprint from request data
const generateFingerprint = (req) => {
    // If client-side fingerprint is available, use it
    if (req.body && req.body.clientFingerprint) {
        return req.body.clientFingerprint;
    }
    
    // If clientFingerprint is set directly on the request object, use it
    if (req.clientFingerprint) {
        return req.clientFingerprint;
    }
    
    const source = req.useragent ? JSON.stringify({
        browser: req.useragent.browser,
        version: req.useragent.version,
        os: req.useragent.os,
        platform: req.useragent.platform,
        source: req.useragent.source,
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }) : JSON.stringify({
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    });

    return crypto.createHash('sha256').update(source).digest('hex');
};

// Middleware to track device fingerprints
const fingerprintMiddleware = (req, res, next) => {
    // Parse user agent
    useragent.express()(req, res, () => {
        // Generate fingerprint
        const fingerprint = generateFingerprint(req);
        req.fingerprint = fingerprint;
        
        // Store fingerprint in session if available
        if (req.session) {
            req.session.fingerprint = fingerprint;
        }
        
        next();
    });
};

// Check if this device has already registered an account
const checkDuplicateDevice = async (req, res, next) => {
    try {
        // Skip if user is already logged in
        if (req.user) {
            return next();
        }

        const fingerprint = req.fingerprint;
        if (!fingerprint) {
            return next();
        }

        // Find existing fingerprint record
        const existingFingerprint = await DeviceFingerprint.findOne({ fingerprint });
        
        // If this device has already registered users, render error page
        if (existingFingerprint && existingFingerprint.userIds.length > 0) {
            req.duplicateDevice = true;
            // Monitoring only, do not block
        }
        
        next();
    } catch (error) {
        console.error("Error checking device fingerprint:", error);
        // Allow registration to continue if there's an error checking
        next();
    }
};

// Save user's device fingerprint after successful registration
const saveUserFingerprint = async (userId, req) => {
    try {
        const fingerprint = req.fingerprint;
        if (!fingerprint || !userId) {
            return;
        }

        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // Find or create fingerprint record
        let fingerprintRecord = await DeviceFingerprint.findOne({ fingerprint });
        
        if (!fingerprintRecord) {
            fingerprintRecord = new DeviceFingerprint({
                fingerprint,
                userIds: [userId],
                ipAddresses: [ip],
                userAgents: [userAgent]
            });
        } else {
            // Add user ID if not already present
            if (!fingerprintRecord.userIds.includes(userId)) {
                fingerprintRecord.userIds.push(userId);
            }
            
            // Add IP address if not already present
            if (!fingerprintRecord.ipAddresses.includes(ip)) {
                fingerprintRecord.ipAddresses.push(ip);
            }
            
            // Add user agent if not already present
            if (!fingerprintRecord.userAgents.includes(userAgent)) {
                fingerprintRecord.userAgents.push(userAgent);
            }
            
            fingerprintRecord.updatedAt = new Date();
        }
        
        await fingerprintRecord.save();
    } catch (error) {
        console.error("Error saving user fingerprint:", error);
    }
};

module.exports = {
    fingerprintMiddleware,
    checkDuplicateDevice,
    saveUserFingerprint,
    DeviceFingerprint
}; 