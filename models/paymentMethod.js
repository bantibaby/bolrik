const mongoose = require('mongoose');

// Schema for tracking payment methods
const paymentMethodSchema = new mongoose.Schema({
    // Type of payment method (bank, upi, paytm)
    type: {
        type: String,
        enum: ['bank', 'upi', 'paytm'],
        required: true
    },
    
    // Details of the payment method
    details: {
        // Bank details
        bankName: String,
        accountNumber: String,
        ifsc: String,
        
        // UPI details
        upiId: String,
        
        // Paytm details
        paytmNumber: String
    },
    
    // Normalized value for searching (lowercase, no spaces)
    normalizedValue: {
        type: String,
        required: true,
        index: true
    },
    
    // User who first registered this payment method
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // When this payment method was first registered
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    // When this payment method was last used for withdrawal
    lastUsedAt: {
        type: Date
    },
    
    // Whether this payment method is locked (can only be used by original user)
    isLocked: {
        type: Boolean,
        default: true
    },
    
    // List of withdrawal IDs made with this payment method
    withdrawals: [{
        withdrawalId: {
            type: mongoose.Schema.Types.ObjectId
        },
        amount: Number,
        date: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected', 'Paid']
        }
    }],
    
    // Admin notes
    adminNotes: String
});

// Create indexes for faster queries
paymentMethodSchema.index({ normalizedValue: 1 });
paymentMethodSchema.index({ userId: 1 });
paymentMethodSchema.index({ type: 1 });

// Helper function to normalize payment method values
paymentMethodSchema.statics.normalizeValue = function(value) {
    if (!value) return '';
    return value.toString().toLowerCase().replace(/\s+/g, '');
};

// Helper function to check if a payment method is already registered
paymentMethodSchema.statics.isPaymentMethodRegistered = async function(type, details) {
    let normalizedValue = '';
    
    if (type === 'bank' && details.accountNumber) {
        normalizedValue = this.normalizeValue(details.accountNumber);
    } else if (type === 'upi' && details.upiId) {
        normalizedValue = this.normalizeValue(details.upiId);
    } else if (type === 'paytm' && details.paytmNumber) {
        normalizedValue = this.normalizeValue(details.paytmNumber);
    }
    
    if (!normalizedValue) return false;
    
    const existingMethod = await this.findOne({ normalizedValue });
    return existingMethod || false;
};

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);

module.exports = PaymentMethod; 