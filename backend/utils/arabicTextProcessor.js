// Enhanced Arabic text processing utility
// This provides better RTL support for Arabic text in PDFs

/**
 * Process Arabic text for better PDF rendering
 * @param {string} text - The text to process
 * @returns {string} - Processed text
 */
function processArabicText(text) {
  if (!text) return '';
  
  // Check if text contains Arabic characters
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  
  if (!arabicRegex.test(text)) {
    return text; // Return as-is if no Arabic characters
  }
  
  // For PDFKit, we need to return the text as-is without reversing
  // The font and PDF engine should handle RTL rendering
  // Reversing the text causes the garbled display we saw
  return text;
}

/**
 * Format Arabic text with proper alignment    
 * @param {string} text - The text to format
 * @param {string} align - Alignment (right, left, center)
 * @returns {object} - Formatted text options
 */
function formatArabicText(text, align = 'right') {
  return {
    text: processArabicText(text),
    align: align,
    features: ['rtla', 'calt'] // Enable Arabic text features if supported
  };
}

/**
 * Check if text is primarily Arabic
 * @param {string} text - The text to check
 * @returns {boolean} - True if text is primarily Arabic
 */
function isArabicText(text) {
  if (!text) return false;
  
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const arabicMatches = text.match(arabicRegex);
  
  if (!arabicMatches) return false;
  
  // Consider text Arabic if more than 30% of characters are Arabic
  return (arabicMatches.length / text.length) > 0.3;
}

module.exports = {
  processArabicText,
  formatArabicText,
  isArabicText
};
