const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// TODO: Paste your RapidAPI endpoint here
const RAPIDAPI_BASE_URL = process.env.RAPIDAPI_URL || 'https://youtube-mp3-audio-video-downloader.p.rapidapi.com';

// TODO: Paste your RapidAPI key here
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'your-rapidapi-key-here';

const axiosInstance = axios.create({
  baseURL: RAPIDAPI_BASE_URL,
  headers: {
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': 'youtube-mp3-audio-video-downloader.p.rapidapi.com',
    'Content-Type': 'application/json'
  }
});

// Validate YouTube URL
function validateYouTubeUrl(url) {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
  return pattern.test(url);
}

// Extract video ID from URL
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// API endpoint to fetch video info
app.post('/api/video-info', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (!validateYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Could not extract video ID' });
    }
    
    // Fetch video info from RapidAPI
    const response = await axiosInstance.get(`/video-info?id=${videoId}`);
    
    if (response.data.error) {
      return res.status(404).json({ error: response.data.error });
    }
    
    res.json({
      success: true,
      data: {
        id: videoId,
        title: response.data.title || 'Untitled',
        thumbnail: response.data.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: response.data.duration || 'N/A',
        channel: response.data.channel || 'Unknown Channel',
        formats: response.data.formats || [],
        adaptiveFormats: response.data.adaptiveFormats || []
      }
    });
    
  } catch (error) {
    console.error('Error fetching video info:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch video information',
      details: error.message 
    });
  }
});

// API endpoint to get download links
app.post('/api/download', async (req, res) => {
  try {
    const { url, format, quality, startTime, endTime } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (!validateYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Could not extract video ID' });
    }
    
    // Build parameters for RapidAPI
    const params = {
      id: videoId,
      format: format || 'mp4',
      quality: quality || '720p'
    };
    
    // Add trimming parameters if provided
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    // Fetch download link from RapidAPI
    const response = await axiosInstance.get('/download', { params });
    
    if (response.data.error) {
      return res.status(404).json({ error: response.data.error });
    }
    
    res.json({
      success: true,
      data: {
        downloadUrl: response.data.downloadUrl,
        fileName: response.data.fileName,
        format: response.data.format,
        quality: response.data.quality,
        size: response.data.size
      }
    });
    
  } catch (error) {
    console.error('Error getting download link:', error.message);
    res.status(500).json({ 
      error: 'Failed to get download link',
      details: error.message 
    });
  }
});

// API endpoint for audio-only download
app.post('/api/download-audio', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (!validateYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Could not extract video ID' });
    }
    
    // Fetch audio download link
    const response = await axiosInstance.get('/mp3', { params: { id: videoId } });
    
    if (response.data.error) {
      return res.status(404).json({ error: response.data.error });
    }
    
    res.json({
      success: true,
      data: {
        downloadUrl: response.data.downloadUrl,
        fileName: response.data.fileName,
        format: 'mp3',
        size: response.data.size
      }
    });
    
  } catch (error) {
    console.error('Error getting audio download link:', error.message);
    res.status(500).json({ 
      error: 'Failed to get audio download link',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'YTvideo backend is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`YTvideo backend server running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}`);
});
