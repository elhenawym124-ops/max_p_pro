const fs = require('fs');
const path = require('path');
const { getSharedPrismaClient } = require('./sharedDatabase');

const getPrisma = () => getSharedPrismaClient();

/**
 * Resolve a URL to a local file path
 * @param {string} fileUrl 
 * @returns {string|null}
 */
const resolveUrlToPath = (fileUrl) => {
    if (!fileUrl) return null;
    try {
        // Extract the path after /uploads/
        const uploadsIndex = fileUrl.indexOf('/uploads/');
        if (uploadsIndex === -1) {
            // Check if it's a relative path starting with uploads/
            if (fileUrl.startsWith('uploads/')) {
                const absolutePathPublic = path.join(process.cwd(), 'public', fileUrl);
                const absolutePathRoot = path.join(process.cwd(), fileUrl);
                if (fs.existsSync(absolutePathRoot)) return absolutePathRoot;
                return absolutePathPublic;
            }
            return null;
        }

        const relativePath = fileUrl.substring(uploadsIndex + 1); // "uploads/..."

        // Check root uploads directory first (newer)
        const absolutePathRoot = path.join(process.cwd(), relativePath);
        if (fs.existsSync(absolutePathRoot)) return absolutePathRoot;

        // Fallback to public/uploads
        const absolutePathPublic = path.join(process.cwd(), 'public', relativePath);
        return absolutePathPublic;
    } catch (e) {
        return null;
    }
};

/**
 * Safely delete a file from disk
 * @param {string} fileUrl 
 */
const deletePhysicalFile = async (fileUrl) => {
    const filePath = resolveUrlToPath(fileUrl);
    if (!filePath) return false;

    try {
        if (fs.existsSync(filePath)) {
            // Check if it's a file and not a directory
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
                fs.unlinkSync(filePath);
                return true;
            }
        }
    } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error.message);
    }
    return false;
};

/**
 * Scan for orphaned files in uploads directories
 */
const scanOrphanedFiles = async () => {
    const prisma = getPrisma();
    const uploadsDirs = [
        path.join(process.cwd(), 'uploads'),
        path.join(process.cwd(), 'public', 'uploads')
    ];

    // 1. Get all files from disk
    const getAllFiles = (dirPath, arrayOfFiles = []) => {
        if (!fs.existsSync(dirPath)) return arrayOfFiles;
        const files = fs.readdirSync(dirPath, { withFileTypes: true });

        files.forEach(file => {
            const fullPath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            } else {
                arrayOfFiles.push(fullPath);
            }
        });

        return arrayOfFiles;
    };

    let diskFiles = [];
    uploadsDirs.forEach(dir => {
        diskFiles = getAllFiles(dir, diskFiles);
    });

    // De-duplicate disk files (absolute paths)
    diskFiles = [...new Set(diskFiles.map(f => path.resolve(f)))];
    console.log(`🔍 [CLEANUP] Found ${diskFiles.length} files on disk across ${uploadsDirs.length} locations`);

    // 2. Collect all URLs from DB
    const dbUrls = new Set();

    // Helper to add URL or JSON array of URLs
    const addUrl = (val) => {
        if (!val) return;
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) {
                    parsed.forEach(u => {
                        if (typeof u === 'string') dbUrls.add(u);
                        else if (u && u.url) dbUrls.add(u.url);
                    });
                } else if (typeof parsed === 'string') {
                    dbUrls.add(parsed);
                } else if (parsed && parsed.url) {
                    dbUrls.add(parsed.url);
                }
            } catch (e) { }
        } else if (typeof val === 'string') {
            dbUrls.add(val);
        }
    };

    console.log('📊 [CLEANUP] Fetching URL references from database...');

    // Batch fetching all relevant models
    const [
        waMessages, messages, gallery, products, mediaFiles,
        users, companies, waContacts, waQuickReplies,
        waSessions, waStatuses, taskAttachments, employeeDocs
    ] = await Promise.all([
        prisma.whatsAppMessage.findMany({ select: { mediaUrl: true }, where: { mediaUrl: { not: null } } }),
        prisma.message.findMany({ select: { attachments: true }, where: { attachments: { not: null } } }),
        prisma.imageGallery.findMany({ select: { fileUrl: true } }),
        prisma.product.findMany({ select: { images: true }, where: { images: { not: null } } }),
        prisma.mediaFile.findMany({ select: { fileUrl: true } }),
        prisma.user.findMany({ select: { avatar: true }, where: { avatar: { not: null } } }),
        prisma.company.findMany({ select: { logo: true }, where: { logo: { not: null } } }),
        prisma.whatsAppContact.findMany({ select: { profilePicUrl: true }, where: { profilePicUrl: { not: null } } }),
        prisma.whatsAppQuickReply.findMany({ select: { mediaUrl: true }, where: { mediaUrl: { not: null } } }),
        prisma.whatsAppSession.findMany({ select: { profilePictureUrl: true }, where: { profilePictureUrl: { not: null } } }),
        prisma.whatsappStatus.findMany({ select: { mediaUrl: true }, where: { mediaUrl: { not: null } } }),
        prisma.taskAttachment.findMany({ select: { filePath: true } }),
        prisma.employeeDocument.findMany({ select: { fileUrl: true } })
    ]);

    waMessages.forEach(m => addUrl(m.mediaUrl));
    messages.forEach(m => addUrl(m.attachments));
    gallery.forEach(m => addUrl(m.fileUrl));
    products.forEach(p => addUrl(p.images));
    mediaFiles.forEach(m => addUrl(m.fileUrl));
    users.forEach(u => addUrl(u.avatar));
    companies.forEach(c => addUrl(c.logo));
    waContacts.forEach(c => addUrl(c.profilePicUrl));
    waQuickReplies.forEach(r => addUrl(r.mediaUrl));
    waSessions.forEach(s => addUrl(s.profilePictureUrl));
    waStatuses.forEach(s => addUrl(s.mediaUrl));
    taskAttachments.forEach(a => addUrl(a.filePath));
    employeeDocs.forEach(d => addUrl(d.fileUrl));

    console.log(`📊 [CLEANUP] Collected unique URLs from database. Normalizing paths...`);

    // 3. Normalize DB URLs to paths
    const dbPaths = new Set();
    dbUrls.forEach(url => {
        const p = resolveUrlToPath(url);
        if (p) dbPaths.add(path.resolve(p).toLowerCase());
    });

    // 4. Find orphaned
    const orphaned = [];
    let totalOrphanedSize = 0;

    diskFiles.forEach(file => {
        const absoluteFile = path.resolve(file).toLowerCase();
        if (!dbPaths.has(absoluteFile)) {
            try {
                const stats = fs.statSync(file);
                orphaned.push({
                    path: file,
                    size: stats.size
                });
                totalOrphanedSize += stats.size;
            } catch (e) { }
        }
    });

    return {
        count: orphaned.length,
        size: totalOrphanedSize,
        files: orphaned
    };
};

/**
 * Delete orphaned files
 */
const cleanupOrphanedFiles = async () => {
    const { files } = await scanOrphanedFiles();
    let deletedCount = 0;
    let deletedSize = 0;

    files.forEach(file => {
        try {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
                deletedCount++;
                deletedSize += file.size;
            }
        } catch (e) {
            console.error(`Error deleting orphaned file ${file.path}:`, e.message);
        }
    });

    return {
        success: true,
        deletedCount,
        deletedSize
    };
};

module.exports = {
    deletePhysicalFile,
    resolveUrlToPath,
    scanOrphanedFiles,
    cleanupOrphanedFiles
};
