const mongoose = require('mongoose');

// Schema for IP address tracking
const ipTrackerSchema = new mongoose.Schema({
    ipAddress: {
        type: String,
        required: true,
        index: true
    },
    userIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    firstUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    firstUserRegisteredAt: {
        type: Date
    },
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    accessCount: {
        type: Number,
        default: 1
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    blockReason: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for faster queries
ipTrackerSchema.index({ ipAddress: 1 });
ipTrackerSchema.index({ isBlocked: 1 });
ipTrackerSchema.index({ createdAt: 1 });

const IPTracker = mongoose.model('IPTracker', ipTrackerSchema);

module.exports = IPTracker; 