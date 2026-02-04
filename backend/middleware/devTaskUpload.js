const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const tasksDir = path.join(uploadsDir, 'dev-tasks');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tasksDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `task-attachment-${uniqueSuffix}${extension}`);
    }
});

const uploadDevTaskFile = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit per file
    }
});

const uploadDevTaskFiles = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit per file
        files: 10 // Maximum 10 files at once
    }
});

module.exports = {
    uploadDevTaskFile,
    uploadDevTaskFiles
};
