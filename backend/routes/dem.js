const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const gdal = require('gdal-async');
const proj4 = require('proj4');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const DEMProcessor = require('../utils/dem-processor');
const router = express.Router();

// Process uploaded DEM file
router.post('/process', async (req, res) => {
    try {
        const { fileId, options = {} } = req.body;
        
        if (!fileId) {
            return res.status(400).json({
                error: 'Missing fileId',
                message: 'File ID is required'
            });
        }

        const filePath = path.join(__dirname, '../uploads', fileId);
        const processedTifPath = path.join(__dirname, '../processed', `${fileId}.tif`);
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({
                error: 'File not found',
                message: 'Uploaded file not found'
            });
        }

        // Convert to COG GeoTIFF if not already present
        const fsSync = require('fs');
        if (!fsSync.existsSync(processedTifPath)) {
            // Use gdal_translate to create a COG
            const { spawn } = require('child_process');
            await new Promise((resolve, reject) => {
                const args = [
                    filePath,
                    processedTifPath,
                    '-of', 'COG',
                    '-co', 'COMPRESS=LZW'
                ];
                const proc = spawn('gdal_translate', args);
                proc.stdout.on('data', data => process.stdout.write(data));
                proc.stderr.on('data', data => process.stderr.write(data));
                proc.on('close', code => code === 0 ? resolve() : reject(new Error('gdal_translate failed')));
                proc.on('error', reject);
            });
        }

        // After COG conversion, extract metadata from the COG file
        let demMeta = {};
        try {
            const dataset = gdal.open(processedTifPath);
            const band = dataset.bands.get(1);
            const size = dataset.rasterSize;
            const geoTransform = dataset.geoTransform;
            const srs = dataset.srs ? dataset.srs.toWKT() : null;
            // Calculate bounds
            const minX = geoTransform[0];
            const maxY = geoTransform[3];
            const pixelWidth = geoTransform[1];
            const pixelHeight = geoTransform[5];
            const maxX = minX + size.x * pixelWidth;
            const minY = maxY + size.y * pixelHeight;
            // Min/max elevation
            const stats = band.getStatistics(false, true);
            demMeta = {
                fileId,
                width: size.x,
                height: size.y,
                bounds: { minX, minY, maxX, maxY },
                minElevation: stats.min,
                maxElevation: stats.max,
                srs
            };
        } catch (metaErr) {
            console.warn('Failed to extract GeoTIFF metadata:', metaErr.message);
        }

        res.json({
            success: true,
            data: { ...demMeta, fileId },
            processedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('DEM processing error:', error);
        res.status(500).json({
            error: 'Processing failed',
            message: error.message
        });
    }
});

// Get DEM metadata
router.post('/metadata', async (req, res) => {
    try {
        const { fileId } = req.body;
        
        if (!fileId) {
            return res.status(400).json({
                error: 'Missing fileId',
                message: 'File ID is required'
            });
        }

        const filePath = path.join(__dirname, '../uploads', fileId);
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({
                error: 'File not found',
                message: 'Uploaded file not found'
            });
        }

        const processor = new DEMProcessor(filePath);
        const metadata = await processor.getMetadata();

        res.json({
            success: true,
            metadata: metadata
        });

    } catch (error) {
        console.error('Metadata extraction error:', error);
        res.status(500).json({
            error: 'Metadata extraction failed',
            message: error.message
        });
    }
});

// Get elevation data at specific coordinates
router.post('/elevation', async (req, res) => {
    try {
        const { fileId, coordinates } = req.body;
        
        if (!fileId || !coordinates) {
            return res.status(400).json({
                error: 'Missing parameters',
                message: 'File ID and coordinates are required'
            });
        }

        const filePath = path.join(__dirname, '../uploads', fileId);
        const processor = new DEMProcessor(filePath);
        
        let elevations;
        if (Array.isArray(coordinates[0])) {
            // Multiple coordinates
            elevations = await processor.getElevations(coordinates);
        } else {
            // Single coordinate
            elevations = await processor.getElevation(coordinates[0], coordinates[1]);
        }

        res.json({
            success: true,
            elevations: elevations
        });

    } catch (error) {
        console.error('Elevation query error:', error);
        res.status(500).json({
            error: 'Elevation query failed',
            message: error.message
        });
    }
});

// Generate DEM tiles for web display
router.post('/tiles', async (req, res) => {
    try {
        const { fileId, tileSize = 256, maxZoom = 10 } = req.body;
        
        if (!fileId) {
            return res.status(400).json({
                error: 'Missing fileId',
                message: 'File ID is required'
            });
        }

        const filePath = path.join(__dirname, '../uploads', fileId);
        const processor = new DEMProcessor(filePath);
        
        const tiles = await processor.generateTiles(tileSize, maxZoom);

        res.json({
            success: true,
            tiles: tiles,
            tileSize: tileSize,
            maxZoom: maxZoom
        });

    } catch (error) {
        console.error('Tile generation error:', error);
        res.status(500).json({
            error: 'Tile generation failed',
            message: error.message
        });
    }
});

// Get processed DEM as JSON
router.get('/processed/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const processedPath = path.join(__dirname, '../processed', `${fileId}.json`);
        
        try {
            const data = await fs.readFile(processedPath, 'utf8');
            const demData = JSON.parse(data);
            
            res.json({
                success: true,
                data: demData
            });
        } catch (error) {
            res.status(404).json({
                error: 'Processed file not found',
                message: 'DEM data has not been processed yet'
            });
        }

    } catch (error) {
        console.error('Processed file retrieval error:', error);
        res.status(500).json({
            error: 'Retrieval failed',
            message: error.message
        });
    }
});

// List available DEM formats
router.get('/formats', (req, res) => {
    res.json({
        success: true,
        supportedFormats: {
            'GeoTIFF': {
                extensions: ['.tif', '.tiff'],
                description: 'Tagged Image File Format with geospatial metadata',
                recommended: true
            },
            'ASCII Grid': {
                extensions: ['.asc', '.grd'],
                description: 'ESRI ASCII Grid format',
                recommended: true
            },
            'NetCDF': {
                extensions: ['.nc', '.cdf'],
                description: 'Network Common Data Form',
                recommended: false
            },
            'HDF5': {
                extensions: ['.h5', '.hdf5'],
                description: 'Hierarchical Data Format version 5',
                recommended: false
            },
            'SRTM': {
                extensions: ['.hgt'],
                description: 'Shuttle Radar Topography Mission format',
                recommended: true
            }
        },
        maxFileSize: '100MB',
        recommendedResolution: '≤ 2048x2048 pixels for web display'
    });
});

module.exports = router;