// Configuration
const BACKEND_URL = 'http://localhost:3001';
let currentVideoData = null;
let selectedFormat = null;

// DOM Elements
const videoUrlInput = document.getElementById('videoUrl');
const fetchBtn = document.getElementById('fetchBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const videoPreview = document.getElementById('videoPreview');
const videoThumbnail = document.getElementById('videoThumbnail');
const videoDuration = document.getElementById('videoDuration');
const videoTitle = document.getElementById('videoTitle');
const channelName = document.getElementById('channelName');
const formatsGrid = document.querySelector('.formats-grid');
const downloadMp3Btn = document.getElementById('downloadMp3');
const playInBrowserBtn = document.getElementById('playInBrowser');
const videoPlayerModal = document.getElementById('videoPlayerModal');
const trimmerModal = document.getElementById('trimmerModal');
const inlineVideoPlayer = document.getElementById('inlineVideoPlayer');
const themeToggle = document.getElementById('themeToggle');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const previewTrimBtn = document.getElementById('previewTrim');
const downloadTrimmedBtn = document.getElementById('downloadTrimmed');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);
});

fetchBtn.addEventListener('click', fetchVideoInfo);
videoUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchVideoInfo();
});

downloadMp3Btn.addEventListener('click', downloadAudio);
playInBrowserBtn.addEventListener('click', playInBrowser);

themeToggle.addEventListener('click', toggleTheme);

// Close modals when clicking X
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        videoPlayerModal.classList.remove('active');
        trimmerModal.classList.remove('active');
    });
});

// Close modals when clicking outside
[ videoPlayerModal, trimmerModal ].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Fetch video information
async function fetchVideoInfo() {
    const url = videoUrlInput.value.trim();
    
    if (!url) {
        showError('Please enter a YouTube URL');
        return;
    }
    
    if (!isValidYouTubeUrl(url)) {
        showError('Please enter a valid YouTube URL');
        return;
    }
    
    showLoading();
    hideError();
    hideVideoPreview();
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/video-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch video information');
        }
        
        currentVideoData = data.data;
        displayVideoInfo();
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Display video information
function displayVideoInfo() {
    if (!currentVideoData) return;
    
    videoThumbnail.src = currentVideoData.thumbnail;
    videoTitle.textContent = currentVideoData.title;
    channelName.textContent = currentVideoData.channel;
    videoDuration.textContent = formatDuration(currentVideoData.duration);
    
    // Set end time input to video duration
    if (currentVideoData.duration) {
        const durationInSeconds = parseDurationToSeconds(currentVideoData.duration);
        endTimeInput.max = durationInSeconds;
        endTimeInput.value = Math.min(60, durationInSeconds);
    }
    
    // Clear previous formats
    formatsGrid.innerHTML = '';
    
    // Add format buttons
    const availableFormats = getAvailableFormats(currentVideoData);
    
    availableFormats.forEach(format => {
        const formatBtn = document.createElement('button');
        formatBtn.className = 'format-btn';
        formatBtn.innerHTML = `
            <div class="format-quality">${format.quality}</div>
            <div class="format-size">${format.size || 'N/A'}</div>
            <div class="format-type">${format.type}</div>
        `;
        
        formatBtn.addEventListener('click', () => selectFormat(format));
        
        formatsGrid.appendChild(formatBtn);
    });
    
    // Select first format by default
    if (availableFormats.length > 0) {
        selectFormat(availableFormats[0]);
    }
    
    videoPreview.style.display = 'block';
}

// Select video format
function selectFormat(format) {
    selectedFormat = format;
    
    // Remove active class from all buttons
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected button
    event.target.closest('.format-btn').classList.add('active');
}

// Download video
async function downloadVideo(trimmed = false) {
    if (!currentVideoData || !selectedFormat) {
        showError('Please select a format first');
        return;
    }
    
    const downloadData = {
        url: videoUrlInput.value.trim(),
        format: selectedFormat.format,
        quality: selectedFormat.quality
    };
    
    if (trimmed) {
        downloadData.startTime = startTimeInput.value;
        downloadData.endTime = endTimeInput.value;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(downloadData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get download link');
        }
        
        // Trigger download
        triggerDownload(data.data.downloadUrl, data.data.fileName);
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Download audio
async function downloadAudio() {
    const url = videoUrlInput.value.trim();
    
    if (!url) {
        showError('Please enter a YouTube URL first');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/download-audio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get audio download link');
        }
        
        // Trigger download
        triggerDownload(data.data.downloadUrl, data.data.fileName);
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Play video in browser
function playInBrowser() {
    if (!currentVideoData) return;
    
    // In a real implementation, you would fetch a playable stream URL
    // For now, we'll use a placeholder or the thumbnail
    inlineVideoPlayer.src = `https://www.youtube.com/embed/${currentVideoData.id}`;
    videoPlayerModal.classList.add('active');
}

// Preview trim
previewTrimBtn.addEventListener('click', () => {
    // Show trimmer modal
    trimmerModal.classList.add('active');
});

// Download trimmed video
downloadTrimmedBtn.addEventListener('click', () => {
    downloadVideo(true);
    trimmerModal
