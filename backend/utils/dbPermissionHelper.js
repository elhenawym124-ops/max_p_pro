/**
 * Database Permission Error Helper
 * 
 * Utility functions to detect and handle database permission errors gracefully
 */

/**
 * Check if an error is a database permission error
 * @param {Error} error - The error object to check
 * @returns {boolean} - True if it's a permission error
 */
function isPermissionError(error) {
  if (!error) return false;
  
  const errorMessage = error.message || '';
  const errorString = JSON.stringify(error);
  
  // Check for MySQL error code 1142 (INSERT/UPDATE/DELETE command denied)
  const hasPermissionError = 
    errorMessage.includes('code: 1142') ||
    errorMessage.includes('INSERT command denied') ||
    errorMessage.includes('UPDATE command denied') ||
    errorMessage.includes('DELETE command denied') ||
    errorString.includes('"code":1142') ||
    errorString.includes('INSERT command denied') ||
    errorString.includes('UPDATE command denied') ||
    errorString.includes('DELETE command denied');
  
  return hasPermissionError;
}

/**
 * Get a simplified error message for permission errors
 * @param {Error} error - The error object
 * @returns {string} - Simplified error message
 */
function getPermissionErrorMessage(error) {
  if (!isPermissionError(error)) {
    return error?.message || 'Unknown error';
  }
  
  const errorMessage = error.message || '';
  
  // Extract table name if possible
  let tableName = 'table';
  const tableMatch = errorMessage.match(/for table `[^`]+`\.`([^`]+)`/);
  if (tableMatch) {
    tableName = tableMatch[1];
  }
  
  // Extract operation type
  let operation = 'operation';
  if (errorMessage.includes('INSERT command denied')) {
    operation = 'INSERT';
  } else if (errorMessage.includes('UPDATE command denied')) {
    operation = 'UPDATE';
  } else if (errorMessage.includes('DELETE command denied')) {
    operation = 'DELETE';
  }
  
  return `Database permission denied: ${operation} on ${tableName}`;
}

/**
 * Handle a database operation with permission error detection
 * @param {Function} operation - The database operation to execute
 * @param {Object} options - Options for error handling
 * @param {boolean} options.silent - If true, only log a brief message instead of full error
 * @param {string} options.context - Context description for logging
 * @returns {Promise<any>} - The result of the operation or null if permission error
 */
async function handleDbOperation(operation, options = {}) {
  const { silent = false, context = 'Database operation' } = options;
  
  try {
    return await operation();
  } catch (error) {
    if (isPermissionError(error)) {
      const simplifiedMessage = getPermissionErrorMessage(error);
      
      if (silent) {
        // Only log a brief message
        console.warn(`⚠️ [DB-PERMISSION] ${context}: ${simplifiedMessage}`);
      } else {
        // Log full error but in a cleaner format
        console.error(`❌ [DB-PERMISSION] ${context}: ${simplifiedMessage}`);
        if (process.env.NODE_ENV === 'development') {
          console.error('Full error:', error);
        }
      }
      
      // Return null to indicate the operation failed due to permissions
      return null;
    }
    
    // Re-throw non-permission errors
    throw error;
  }
}

module.exports = {
  isPermissionError,
  getPermissionErrorMessage,
  handleDbOperation
};

