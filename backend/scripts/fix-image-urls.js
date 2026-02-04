/**
 * Database Fix Script for Image URLs
 * This script fixes the image URLs in the database to work correctly in development environment
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixImageUrls() {
  try {
    console.log('🔧 [DB-FIX] Starting database image URL fix...');
    
    // Get all messages with IMAGE type that have wrong URLs
    const messages = await prisma.message.findMany({
      where: {
        type: 'IMAGE',
        OR: [
          { content: { contains: 'https://www.maxp-ai.pro/uploads/conversations/' } },
          { attachments: { contains: 'https://www.maxp-ai.pro/uploads/conversations/' } },
          { metadata: { contains: 'https://www.maxp-ai.pro/uploads/conversations/' } }
        ]
      }
    });

    console.log(`📊 [DB-FIX] Found ${messages.length} messages with image URLs to fix`);

    let fixedCount = 0;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const localHost = 'http://localhost:3001';
    const prodHost = 'https://www.maxp-ai.pro';

    for (const message of messages) {
      let needsUpdate = false;
      let updatedContent = message.content;
      let updatedAttachments = message.attachments;
      let updatedMetadata = message.metadata;

      // Fix content URLs
      if (message.content && message.content.includes('https://www.maxp-ai.pro/uploads/conversations/')) {
        if (isDevelopment) {
          updatedContent = message.content.replace('https://www.maxp-ai.pro', localHost);
        } else {
          updatedContent = message.content.replace('https://www.maxp-ai.pro', prodHost);
        }
        needsUpdate = true;
        console.log(`📝 [DB-FIX] Fixed content URL for message ${message.id}`);
      }

      // Fix attachments URLs
      if (message.attachments) {
        try {
          const attachments = JSON.parse(message.attachments);
          let attachmentsUpdated = false;
          
          for (const attachment of attachments) {
            if (attachment.url && attachment.url.includes('https://www.maxp-ai.pro/uploads/conversations/')) {
              if (isDevelopment) {
                attachment.url = attachment.url.replace('https://www.maxp-ai.pro', localHost);
              } else {
                attachment.url = attachment.url.replace('https://www.maxp-ai.pro', prodHost);
              }
              attachmentsUpdated = true;
            }
          }
          
          if (attachmentsUpdated) {
            updatedAttachments = JSON.stringify(attachments);
            needsUpdate = true;
            console.log(`📎 [DB-FIX] Fixed attachments URL for message ${message.id}`);
          }
        } catch (e) {
          console.warn(`⚠️ [DB-FIX] Failed to parse attachments for message ${message.id}`);
        }
      }

      // Fix metadata URLs
      if (message.metadata) {
        try {
          const metadata = JSON.parse(message.metadata);
          let metadataUpdated = false;
          
          if (metadata.fileUrl && metadata.fileUrl.includes('https://www.maxp-ai.pro/uploads/conversations/')) {
            if (isDevelopment) {
              metadata.fileUrl = metadata.fileUrl.replace('https://www.maxp-ai.pro', localHost);
            } else {
              metadata.fileUrl = metadata.fileUrl.replace('https://www.maxp-ai.pro', prodHost);
            }
            metadataUpdated = true;
          }
          
          if (metadataUpdated) {
            updatedMetadata = JSON.stringify(metadata);
            needsUpdate = true;
            console.log(`🔗 [DB-FIX] Fixed metadata URL for message ${message.id}`);
          }
        } catch (e) {
          console.warn(`⚠️ [DB-FIX] Failed to parse metadata for message ${message.id}`);
        }
      }

      // Update the message if needed
      if (needsUpdate) {
        await prisma.message.update({
          where: { id: message.id },
          data: {
            content: updatedContent,
            attachments: updatedAttachments,
            metadata: updatedMetadata
          }
        });
        fixedCount++;
      }
    }

    console.log(`✅ [DB-FIX] Fixed ${fixedCount} messages out of ${messages.length} found`);
    console.log(`🎯 [DB-FIX] Environment: ${isDevelopment ? 'Development' : 'Production'}`);
    console.log(`🔗 [DB-FIX] Host used: ${isDevelopment ? localHost : prodHost}`);
    
  } catch (error) {
    console.error('❌ [DB-FIX] Error fixing image URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixImageUrls();