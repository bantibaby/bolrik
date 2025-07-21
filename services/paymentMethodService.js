const PaymentMethod = require('../models/paymentMethod');
const User = require('../models/user');

/**
 * Validates and registers a payment method
 * @param {String} userId - User ID
 * @param {String} type - Payment method type (bank, upi, paytm)
 * @param {Object} details - Payment method details
 * @returns {Object} Result of the validation
 */
const validateAndRegisterPaymentMethod = async (userId, type, details) => {
    try {
        // Normalize the value based on type
        let normalizedValue = '';
        
        if (type === 'bank' && details.accountNumber) {
            normalizedValue = PaymentMethod.normalizeValue(details.accountNumber);
        } else if (type === 'upi' && details.upiId) {
            normalizedValue = PaymentMethod.normalizeValue(details.upiId);
        } else if (type === 'paytm' && details.paytmNumber) {
            normalizedValue = PaymentMethod.normalizeValue(details.paytmNumber);
        }
        
        if (!normalizedValue) {
            return { 
                success: false, 
                message: "अमान्य भुगतान विवरण" 
            };
        }
        
        // Check if this payment method is already registered
        const existingMethod = await PaymentMethod.findOne({ normalizedValue });
        
        if (existingMethod) {
            // If payment method exists but belongs to a different user
            if (existingMethod.userId.toString() !== userId.toString()) {
                return { 
                    success: false, 
                    message: "यह भुगतान विवरण पहले से ही किसी अन्य खाते से जुड़ा है। कृपया अलग विवरण दर्ज करें।" 
                };
            }
            
            // If payment method exists and belongs to this user, it's an update
            return { 
                success: true, 
                message: "भुगतान विवरण अपडेट किया गया", 
                paymentMethod: existingMethod 
            };
        }
        
        // Create new payment method
        const newPaymentMethod = new PaymentMethod({
            type,
            details,
            normalizedValue,
            userId
        });
        
        await newPaymentMethod.save();
        
        return { 
            success: true, 
            message: "भुगतान विवरण सफलतापूर्वक जोड़ा गया", 
            paymentMethod: newPaymentMethod 
        };
    } catch (error) {
        console.error("Error validating payment method:", error);
        return { 
            success: false, 
            message: "भुगतान विवरण वैलिडेट करने में त्रुटि हुई" 
        };
    }
};

/**
 * Updates payment method history in user record
 * @param {String} userId - User ID
 * @param {String} type - Payment method type (bank, upi, paytm)
 * @param {Object} details - Payment method details
 */
const updatePaymentMethodHistory = async (userId, type, details) => {
    try {
        const user = await User.findById(userId);
        
        if (!user) {
            throw new Error("User not found");
        }
        
        // Initialize banking and paymentMethodHistory if they don't exist
        if (!user.banking) {
            user.banking = {};
        }
        
        if (!user.banking.paymentMethodHistory) {
            user.banking.paymentMethodHistory = [];
        }
        
        // Add current payment method to history
        user.banking.paymentMethodHistory.push({
            type,
            details,
            updatedAt: new Date()
        });
        
        // Update current payment method
        if (type === 'bank') {
            user.banking.bankName = details.bankName;
            user.banking.accountNumber = details.accountNumber;
            user.banking.ifsc = details.ifsc;
        } else if (type === 'upi') {
            user.banking.upiId = details.upiId;
        } else if (type === 'paytm') {
            user.banking.paytmNumber = details.paytmNumber;
        }
        
        await user.save();
        
        return { success: true };
    } catch (error) {
        console.error("Error updating payment method history:", error);
        return { success: false, error };
    }
};

/**
 * Validates payment method for withdrawal
 * @param {String} userId - User ID
 * @param {String} type - Payment method type (bank, upi, paytm)
 * @param {Object} details - Payment method details
 * @returns {Object} Result of the validation
 */
const validateWithdrawalPaymentMethod = async (userId, type, details) => {
    try {
        // Normalize the value based on type
        let normalizedValue = '';
        
        if (type === 'bank' && details.accountNumber) {
            normalizedValue = PaymentMethod.normalizeValue(details.accountNumber);
        } else if (type === 'upi' && details.upiId) {
            normalizedValue = PaymentMethod.normalizeValue(details.upiId);
        } else if (type === 'paytm' && details.paytmNumber) {
            normalizedValue = PaymentMethod.normalizeValue(details.paytmNumber);
        }
        
        if (!normalizedValue) {
            return { 
                success: false, 
                message: "अमान्य भुगतान विवरण" 
            };
        }
        
        // Check if this payment method is registered
        const paymentMethod = await PaymentMethod.findOne({ normalizedValue });
        
        if (!paymentMethod) {
            return { 
                success: false, 
                message: "भुगतान विवरण पंजीकृत नहीं है। कृपया पहले अपने प्रोफाइल में इसे जोड़ें।" 
            };
        }
        
        // Check if payment method belongs to this user
        if (paymentMethod.userId.toString() !== userId.toString()) {
            return { 
                success: false, 
                message: "यह भुगतान विवरण आपके खाते से जुड़ा नहीं है। कृपया अपना पंजीकृत भुगतान विवरण उपयोग करें।" 
            };
        }
        
        // Payment method is valid for this user
        return { 
            success: true, 
            message: "भुगतान विवरण मान्य है", 
            paymentMethod 
        };
    } catch (error) {
        console.error("Error validating withdrawal payment method:", error);
        return { 
            success: false, 
            message: "भुगतान विवरण वैलिडेट करने में त्रुटि हुई" 
        };
    }
};

/**
 * Records a withdrawal with a payment method
 * @param {String} paymentMethodId - Payment method ID
 * @param {String} withdrawalId - Withdrawal ID
 * @param {Number} amount - Withdrawal amount
 * @param {String} status - Withdrawal status
 */
const recordWithdrawal = async (paymentMethodId, withdrawalId, amount, status = 'Pending') => {
    try {
        const paymentMethod = await PaymentMethod.findById(paymentMethodId);
        
        if (!paymentMethod) {
            throw new Error("Payment method not found");
        }
        
        paymentMethod.withdrawals.push({
            withdrawalId,
            amount,
            date: new Date(),
            status
        });
        
        paymentMethod.lastUsedAt = new Date();
        
        await paymentMethod.save();
        
        return { success: true };
    } catch (error) {
        console.error("Error recording withdrawal:", error);
        return { success: false, error };
    }
};

module.exports = {
    validateAndRegisterPaymentMethod,
    updatePaymentMethodHistory,
    validateWithdrawalPaymentMethod,
    recordWithdrawal
}; 