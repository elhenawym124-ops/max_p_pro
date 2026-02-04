/**
 * Safe SentMessageStat Helper
 * 
 * Provides a safe way to create sentMessageStat records that handles
 * permission errors gracefully without breaking the application flow.
 * 
 * This is specifically designed to handle MySQL permission errors (code 1142)
 * where the user doesn't have INSERT permissions on the sent_message_stats table.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * Safely create a sentMessageStat record
 * 
 * This function handles permission errors gracefully and never throws exceptions.
 * It checks for existing records first to avoid duplicates.
 * 
 * @param {Object} data - The data object to create the sentMessageStat record with
 * @param {string} data.messageId - Required: The unique message ID
 * @param {Object} options - Optional configuration
 * @param {boolean} options.skipExistingCheck - Skip the existence check (default: false)
 * @returns {Promise<{success: boolean, created: boolean, error?: string}>}
 */
async function safeCreateSentMessageStat(data, options = {}) {
  const { skipExistingCheck = false } = options;

  try {
    // Validate required field
    if (!data || !data.messageId) {
      console.warn('⚠️ [SENT-STATS] Cannot create stat: messageId is required');
      return { success: false, created: false, error: 'messageId is required' };
    }

    const prisma = getSharedPrismaClient();

    // Check if record already exists (unless skipExistingCheck is true)
    if (!skipExistingCheck) {
      try {
        const existingStat = await prisma.sentMessageStat.findUnique({
          where: { messageId: data.messageId }
        });

        if (existingStat) {
          // Record already exists, return success but not created
          return { success: true, created: false, error: 'already_exists' };
        }
      } catch (checkError) {
        // If we can't check for existing records, log but continue
        // This might be a permission issue on SELECT as well
        const errorMessage = checkError.message || String(checkError);
        if (errorMessage.includes('1142') || errorMessage.includes('SELECT command denied')) {
          console.warn(`⚠️ [SENT-STATS] Permission denied when checking existing stat for messageId: ${data.messageId.slice(-8)}`);
        } else {
          console.warn(`⚠️ [SENT-STATS] Error checking existing stat: ${errorMessage}`);
        }
        // Continue to try creating anyway
      }
    }

    // Attempt to create the record
    try {
      await prisma.sentMessageStat.create({
        data: data
      });

      // Successfully created
      return { success: true, created: true };
    } catch (createError) {
      // Handle permission errors specifically
      const errorMessage = createError.message || String(createError);
      const errorCode = createError.code;

      // Check for MySQL permission error (code 1142)
      if (errorMessage.includes('1142') || 
          errorMessage.includes('INSERT command denied') ||
          (errorCode && String(errorCode).includes('1142'))) {
        
        // Permission denied - log as warning but don't throw
        console.warn(`⚠️ [SENT-STATS] INSERT permission denied for sent_message_stats table (messageId: ${data.messageId.slice(-8)}). This is expected if the database user lacks INSERT permissions.`);
        
        return { 
          success: false, 
          created: false, 
          error: 'permission_denied',
          details: 'Database user does not have INSERT permission on sent_message_stats table'
        };
      }

      // Handle other database errors (connection issues, constraint violations, etc.)
      if (errorMessage.includes('P2002') || errorMessage.includes('Unique constraint')) {
        // Unique constraint violation - record might have been created concurrently
        console.warn(`⚠️ [SENT-STATS] Unique constraint violation for messageId: ${data.messageId.slice(-8)} (may have been created concurrently)`);
        return { success: true, created: false, error: 'already_exists' };
      }

      // For other errors, log them but still return gracefully
      console.error(`❌ [SENT-STATS] Error creating sentMessageStat for messageId ${data.messageId.slice(-8)}:`, errorMessage);
      return { 
        success: false, 
        created: false, 
        error: 'creation_failed',
        details: errorMessage
      };
    }
  } catch (unexpectedError) {
    // Catch any unexpected errors (e.g., null reference, etc.)
    console.error('❌ [SENT-STATS] Unexpected error in safeCreateSentMessageStat:', unexpectedError.message || String(unexpectedError));
    return { 
      success: false, 
      created: false, 
      error: 'unexpected_error',
      details: unexpectedError.message || String(unexpectedError)
    };
  }
}

module.exports = {
  safeCreateSentMessageStat
};

