const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Process an image: Resize and convert to WebP
 * @param {string} inputPath - Absolute path to the original image
 * @param {string} outputDir - Directory to save the processed image
 * @param {Object} options - Processing options (width, quality)
 * @returns {Promise<Object>} - Processed file info (filename, size, path)
 */
const processImage = async (inputPath, outputDir, options = {}) => {
    const {
        width = 1200,
        quality = 80,
        keepOriginal = false
    } = options;

    try {
        const filename = path.basename(inputPath, path.extname(inputPath)) + '.webp';
        const outputPath = path.join(outputDir, filename);

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const info = await sharp(inputPath)
            .resize(width, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .webp({ quality })
            .toFile(outputPath);

        // Delete original if not requested to keep
        if (!keepOriginal && inputPath !== outputPath) {
            try {
                fs.unlinkSync(inputPath);
            } catch (err) {
                console.error(`[imageProcessor] Error deleting original file: ${err.message}`);
            }
        }

        return {
            filename,
            path: outputPath,
            size: info.size,
            format: 'webp',
            width: info.width,
            height: info.height
        };
    } catch (error) {
        console.error(`[imageProcessor] Error processing image: ${error.message}`);
        throw error;
    }
};

/**
 * Check if a file is a processable image
 * @param {string} mimetype 
 * @returns {boolean}
 */
const isProcessableImage = (mimetype) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    return allowedTypes.includes(mimetype);
};

module.exports = {
    processImage,
    isProcessableImage
};
