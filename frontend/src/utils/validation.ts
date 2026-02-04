/**
 * Validation utilities for order management
 */

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Validate Egyptian phone number
 * Accepts formats: 01xxxxxxxxx, +201xxxxxxxxx, 00201xxxxxxxxx
 */
export const validateEgyptianPhone = (phone: string): ValidationResult => {
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
export const validatePrice = (price: number | string): ValidationResult => {
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
export const validateQuantity = (quantity: number | string): ValidationResult => {
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
 * Validate product name
 */
export const validateProductName = (name: string): ValidationResult => {
    if (!name || name.trim() === '') {
        return { isValid: false, error: 'اسم المنتج مطلوب' };
    }

    if (name.trim().length < 2) {
        return { isValid: false, error: 'اسم المنتج قصير جداً' };
    }

    if (name.length > 200) {
        return { isValid: false, error: 'اسم المنتج طويل جداً' };
    }

    return { isValid: true };
};

/**
 * Validate customer name
 */
export const validateCustomerName = (name: string): ValidationResult => {
    if (!name || name.trim() === '') {
        return { isValid: false, error: 'اسم العميل مطلوب' };
    }

    if (name.trim().length < 2) {
        return { isValid: false, error: 'اسم العميل قصير جداً' };
    }

    if (name.length > 100) {
        return { isValid: false, error: 'اسم العميل طويل جداً' };
    }

    return { isValid: true };
};

/**
 * Validate address
 */
export const validateAddress = (address: string): ValidationResult => {
    if (!address || address.trim() === '') {
        return { isValid: false, error: 'العنوان مطلوب' };
    }

    if (address.trim().length < 10) {
        return { isValid: false, error: 'العنوان قصير جداً (الحد الأدنى 10 أحرف)' };
    }

    if (address.length > 500) {
        return { isValid: false, error: 'العنوان طويل جداً' };
    }

    return { isValid: true };
};

/**
 * Validate order items array
 */
export const validateOrderItems = (items: any[]): ValidationResult => {
    if (!items || items.length === 0) {
        return { isValid: false, error: 'يجب إضافة منتج واحد على الأقل للطلب' };
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Validate product name
        const nameValidation = validateProductName(item.productName || item.name || '');
        if (!nameValidation.isValid) {
            return { isValid: false, error: `المنتج ${i + 1}: ${nameValidation.error}` };
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
