const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const fileId = uuidv4();
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${fileId}${ext}`);
    }
});

// File filter for DEM formats
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.tif', '.tiff', '.asc', '.grd', '.hgt', '.nc', '.cdf', '.h5', '.hdf5'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file format: ${ext}. Allowed formats: ${allowedExtensions.join(', ')}`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
        files: 1
    }
});

// Upload endpoint
router.post('/', upload.single('demFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please select a DEM file to upload'
            });
        }

        const fileInfo = {
            fileId: path.parse(req.file.filename).name,
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            extension: path.extname(req.file.originalname).toLowerCase(),
            uploadedAt: new Date().toISOString(),
            path: req.file.path
        };

        // Save file info for later reference
        const infoPath = path.join(__dirname, '../uploads', `${fileInfo.fileId}.json`);
        await fs.writeFile(infoPath, JSON.stringify(fileInfo, null, 2));

        res.json({
            success: true,
            file: {
                fileId: fileInfo.fileId,
                originalName: fileInfo.originalName,
                size: fileInfo.size,
                extension: fileInfo.extension,
                uploadedAt: fileInfo.uploadedAt
            },
            message: 'File uploaded successfully'
        });

    } catch (error) {
        console.error('Upload error:', error);
        
        // Clean up file if it was uploaded but processing failed
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (cleanupError) {
                console.error('Failed to cleanup uploaded file:', cleanupError);
            }
        }

        res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    }
});

// Get upload status/info
router.get('/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const infoPath = path.join(__dirname, '../uploads', `${fileId}.json`);
        
        try {
            const infoData = await fs.readFile(infoPath, 'utf8');
            const fileInfo = JSON.parse(infoData);
            
            // Check if actual file still exists
            try {
                const stats = await fs.stat(fileInfo.path);
                fileInfo.exists = true;
                fileInfo.actualSize = stats.size;
            } catch (error) {
                fileInfo.exists = false;
            }

            res.json({
                success: true,
                file: fileInfo
            });
        } catch (error) {
            res.status(404).json({
                error: 'File not found',
                message: 'File information not found'
            });
        }

    } catch (error) {
        console.error('File info retrieval error:', error);
        res.status(500).json({
            error: 'Retrieval failed',
            message: error.message
        });
    }
});

// Delete uploaded file
router.delete('/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const infoPath = path.join(__dirname, '../uploads', `${fileId}.json`);
        
        // Get file info
        let fileInfo;
        try {
            const infoData = await fs.readFile(infoPath, 'utf8');
            fileInfo = JSON.parse(infoData);
        } catch (error) {
            return res.status(404).json({
                error: 'File not found',
                message: 'File information not found'
            });
        }

        // Delete actual file
        try {
            await fs.unlink(fileInfo.path);
        } catch (error) {
            console.warn('Failed to delete file (may not exist):', error.message);
        }

        // Delete info file
        try {
            await fs.unlink(infoPath);
        } catch (error) {
            console.warn('Failed to delete info file:', error.message);
        }

        // Delete processed file if exists
        const processedPath = path.join(__dirname, '../processed', `${fileId}.json`);
        try {
            await fs.unlink(processedPath);
        } catch (error) {
            // Processed file may not exist, that's okay
        }

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('File deletion error:', error);
        res.status(500).json({
            error: 'Deletion failed',
            message: error.message
        });
    }
});

// List uploaded files
router.get('/', async (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, '../uploads');
        const files = await fs.readdir(uploadsDir);
        
        const infoFiles = files.filter(file => file.endsWith('.json'));
        const fileList = [];

        for (const infoFile of infoFiles) {
            try {
                const infoPath = path.join(uploadsDir, infoFile);
                const infoData = await fs.readFile(infoPath, 'utf8');
                const fileInfo = JSON.parse(infoData);
                
                // Check if actual file exists
                try {
                    await fs.access(fileInfo.path);
                    fileInfo.exists = true;
                } catch (error) {
                    fileInfo.exists = false;
                }

                fileList.push({
                    fileId: fileInfo.fileId,
                    originalName: fileInfo.originalName,
                    size: fileInfo.size,
                    extension: fileInfo.extension,
                    uploadedAt: fileInfo.uploadedAt,
                    exists: fileInfo.exists
                });
            } catch (error) {
                console.warn(`Failed to read info file ${infoFile}:`, error.message);
            }
        }

        // Sort by upload date (newest first)
        fileList.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

        res.json({
            success: true,
            files: fileList,
            count: fileList.length
        });

    } catch (error) {
        console.error('File listing error:', error);
        res.status(500).json({
            error: 'Listing failed',
            message: error.message
        });
    }
});

module.exports = router;