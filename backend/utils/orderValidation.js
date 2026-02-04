/**
 * Validation utilities for order management (Backend)
 */

/**
 * Validate Egyptian phone number
 */
const validateEgyptianPhone = (phone) => {
    if (!phone || phone.trim() === '') {
        return { isValid: false, error: 'رقم الهاتف مطلوب' };
    }

    // Remove spaces and dashes
    const cleanPhone = phone.replace(/[\s-]/g, '');

    // Egyptian phone patterns
    const patterns = [
        /^01[0-2,5]{1}[0-9]{8}$/, // 01xxxxxxxxx
        /^\+2001[0-2,5]{1}[0-9]{8}$/, // +201xxxxxxxxx
        /^00201[0-2,5]{1}[0-9]{8}$/, // 00201xxxxxxxxx
    ];

    const isValid = patterns.some(pattern => pattern.test(cleanPhone));

    if (!isValid) {
        return {
            isValid: false,
            error: 'رقم الهاتف غير صحيح. يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015'
        };
    }

    return { isValid: true };
};

/**
 * Validate price (must be positive number)
 */
const validatePrice = (price) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;

    if (isNaN(numPrice)) {
        return { isValid: false, error: 'السعر يجب أن يكون رقماً' };
    }

    if (numPrice <= 0) {
        return { isValid: false, error: 'السعر يجب أن يكون أكبر من صفر' };
    }

    if (numPrice > 1000000) {
        return { isValid: false, error: 'السعر كبير جداً' };
    }

    return { isValid: true };
};

/**
 * Validate quantity (must be positive integer)
 */
const validateQuantity = (quantity) => {
    const numQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity;

    if (isNaN(numQuantity)) {
        return { isValid: false, error: 'الكمية يجب أن تكون رقماً' };
    }

    if (numQuantity <= 0) {
        return { isValid: false, error: 'الكمية يجب أن تكون أكبر من صفر' };
    }

    if (numQuantity > 9999) {
        return { isValid: false, error: 'الكمية كبيرة جداً (الحد الأقصى 9999)' };
    }

    if (!Number.isInteger(numQuantity)) {
        return { isValid: false, error: 'الكمية يجب أن تكون رقماً صحيحاً' };
    }

    return { isValid: true };
};

/**
 * Validate order items array
 */
const validateOrderItems = (items) => {
    if (!items || items.length === 0) {
        return { isValid: false, error: 'يجب إضافة منتج واحد على الأقل للطلب' };
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Validate product name
        if (!item.productName || item.productName.trim() === '') {
            return { isValid: false, error: `المنتج ${i + 1}: اسم المنتج مطلوب` };
        }

        // Validate price
        const priceValidation = validatePrice(item.price);
        if (!priceValidation.isValid) {
            return { isValid: false, error: `المنتج ${i + 1}: ${priceValidation.error}` };
        }

        // Validate quantity
        const quantityValidation = validateQuantity(item.quantity);
        if (!quantityValidation.isValid) {
            return { isValid: false, error: `المنتج ${i + 1}: ${quantityValidation.error}` };
        }
    }

    return { isValid: true };
};

module.exports = {
    validateEgyptianPhone,
    validatePrice,
    validateQuantity,
    validateOrderItems
};
