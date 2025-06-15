// Background service worker for YouTube Notes Converter extension

// Extension installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
  console.log('YouTube Notes Converter installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.sync.set({
      user_settings: {
        summaryDepth: 'medium',
        includeTimestamps: true,
        autoGenerate: false,
        exportFormat: 'markdown',
        theme: 'light'
      }
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.type);
  
  switch (request.type) {
    case 'GET_SETTINGS':
      handleGetSettings(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'SAVE_SETTINGS':
      handleSaveSettings(request.settings, sendResponse);
      return true;
      
    case 'SAVE_API_KEY':
      handleSaveApiKey(request.apiKey, sendResponse);
      return true;
      
    case 'GET_API_KEY':
      handleGetApiKey(sendResponse);
      return true;
      
    case 'CACHE_NOTES':
      handleCacheNotes(request.videoId, request.notes, sendResponse);
      return true;
      
    case 'GET_CACHED_NOTES':
      handleGetCachedNotes(request.videoId, sendResponse);
      return true;
      
    case 'CLEAR_CACHE':
      handleClearCache(sendResponse);
      return true;
      
    default:
      console.warn('Unknown message type:', request.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Settings management
async function handleGetSettings(sendResponse) {
  try {
    const result = await chrome.storage.sync.get('user_settings');
    const settings = result.user_settings || {
      summaryDepth: 'medium',
      includeTimestamps: true,
      autoGenerate: false,
      exportFormat: 'markdown',
      theme: 'light'
    };
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveSettings(settings, sendResponse) {
  try {
    await chrome.storage.sync.set({ user_settings: settings });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// API key management
async function handleSaveApiKey(apiKey, sendResponse) {
  try {
    await chrome.storage.local.set({ openai_api_key: apiKey });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving API key:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetApiKey(sendResponse) {
  try {
    const result = await chrome.storage.local.get('openai_api_key');
    sendResponse({ 
      success: true, 
      apiKey: result.openai_api_key || null 
    });
  } catch (error) {
    console.error('Error getting API key:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Notes caching
async function handleCacheNotes(videoId, notes, sendResponse) {
  try {
    const cacheKey = `notes_${videoId}`;
    const cacheData = {
      notes,
      timestamp: Date.now(),
      videoId
    };
    
    await chrome.storage.local.set({ [cacheKey]: cacheData });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error caching notes:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetCachedNotes(videoId, sendResponse) {
  try {
    const cacheKey = `notes_${videoId}`;
    const result = await chrome.storage.local.get(cacheKey);
    const cachedData = result[cacheKey];
    
    if (cachedData) {
      // Check if cache is still valid (24 hours)
      const isValid = (Date.now() - cachedData.timestamp) < (24 * 60 * 60 * 1000);
      if (isValid) {
        sendResponse({ success: true, notes: cachedData.notes });
        return;
      }
    }
    
    sendResponse({ success: true, notes: null });
  } catch (error) {
    console.error('Error getting cached notes:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Cache management
async function handleClearCache(sendResponse) {
  try {
    const allData = await chrome.storage.local.get();
    const keysToRemove = Object.keys(allData).filter(key => 
      key.startsWith('notes_') || key.startsWith('transcript_')
    );
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
    
    sendResponse({ success: true, clearedItems: keysToRemove.length });
  } catch (error) {
    console.error('Error clearing cache:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Tab update handling for YouTube navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      (tab.url.includes('youtube.com/watch') || tab.url.includes('youtu.be/'))) {
    
    // Inject content script if not already present
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['config.js', 'transcript-extractor.js', 'ai-processor.js', 'storage-manager.js', 'content.js']
    }).catch(error => {
      // Script might already be injected, ignore error
      console.log('Content script injection skipped:', error.message);
    });
  }
});
