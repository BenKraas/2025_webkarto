const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;

const demRoutes = require('./routes/dem');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false, // Required for SharedArrayBuffer in some cases
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true
}));

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve processed files statically
app.use('/processed', express.static(path.join(__dirname, 'processed')));

// API Routes
app.use('/api/dem', demRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        gdal: process.env.GDAL_VERSION || 'available'
    });
});

// API info endpoint
app.get('/api/info', (req, res) => {
    res.json({
        name: '3D WebMap Backend',
        version: '1.0.0',
        features: [
            'GeoTIFF processing',
            'ASCII Grid support',
            'DEM metadata extraction',
            'Coordinate transformation',
            'Tile generation',
            'Elevation data extraction'
        ],
        endpoints: {
            '/api/health': 'Health check',
            '/api/info': 'API information',
            '/api/upload': 'File upload endpoint',
            '/api/dem/process': 'Process DEM files',
            '/api/dem/metadata': 'Extract DEM metadata',
            '/api/dem/elevation': 'Get elevation data',
            '/api/dem/tiles': 'Generate DEM tiles'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            error: 'File too large',
            message: 'Maximum file size is 100MB'
        });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            error: 'Invalid file',
            message: 'Only DEM files are allowed'
        });
    }
    
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'API endpoint not found'
    });
});

// Ensure directories exist
async function ensureDirectories() {
    const dirs = ['uploads', 'processed', 'temp'];
    for (const dir of dirs) {
        try {
            await fs.mkdir(path.join(__dirname, dir), { recursive: true });
            console.log(`✓ Directory ensured: ${dir}`);
        } catch (error) {
            console.error(`✗ Failed to create directory ${dir}:`, error);
        }
    }
}

// Start server
async function startServer() {
    try {
        await ensureDirectories();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 3D WebMap Backend running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`📖 API info: http://localhost:${PORT}/api/info`);
            console.log(`🗺️  Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});