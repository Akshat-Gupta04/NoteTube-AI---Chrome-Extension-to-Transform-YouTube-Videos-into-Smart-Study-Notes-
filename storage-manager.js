// Storage management for YouTube Notes Converter extension

// Prevent redeclaration
if (typeof window.NotesStorageManager === 'undefined') {

class NotesStorageManager {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 50; // Maximum number of cached items
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  // Save notes to storage
  async saveNotes(videoId, notes, videoInfo = null) {
    try {
      const notesData = {
        notes: notes,
        videoInfo: videoInfo,
        timestamp: Date.now(),
        videoId: videoId
      };

      // Save to Chrome storage
      await chrome.runtime.sendMessage({
        type: 'CACHE_NOTES',
        videoId: videoId,
        notes: notesData
      });

      // Update local cache
      this.cache.set(`notes_${videoId}`, notesData);
      this.cleanupCache();

      return { success: true };
    } catch (error) {
      console.error('Error saving notes:', error);
      return { success: false, error: error.message };
    }
  }

  // Load notes from storage
  async loadNotes(videoId) {
    try {
      // Check local cache first
      const cacheKey = `notes_${videoId}`;
      if (this.cache.has(cacheKey)) {
        const cachedData = this.cache.get(cacheKey);
        if (this.isDataValid(cachedData)) {
          return { success: true, data: cachedData };
        } else {
          this.cache.delete(cacheKey);
        }
      }

      // Load from Chrome storage
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CACHED_NOTES',
        videoId: videoId
      });

      if (response.success && response.notes) {
        // Update local cache
        this.cache.set(cacheKey, response.notes);
        return { success: true, data: response.notes };
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('Error loading notes:', error);
      return { success: false, error: error.message };
    }
  }

  // Save transcript to storage
  async saveTranscript(videoId, transcript, videoInfo = null) {
    try {
      const transcriptData = {
        transcript: transcript,
        videoInfo: videoInfo,
        timestamp: Date.now(),
        videoId: videoId
      };

      const cacheKey = `transcript_${videoId}`;

      // Save to Chrome storage
      await chrome.storage.local.set({ [cacheKey]: transcriptData });

      // Update local cache
      this.cache.set(cacheKey, transcriptData);
      this.cleanupCache();

      return { success: true };
    } catch (error) {
      console.error('Error saving transcript:', error);
      return { success: false, error: error.message };
    }
  }

  // Load transcript from storage
  async loadTranscript(videoId) {
    try {
      // Check local cache first
      const cacheKey = `transcript_${videoId}`;
      if (this.cache.has(cacheKey)) {
        const cachedData = this.cache.get(cacheKey);
        if (this.isDataValid(cachedData)) {
          return { success: true, data: cachedData };
        } else {
          this.cache.delete(cacheKey);
        }
      }

      // Load from Chrome storage
      const result = await chrome.storage.local.get(cacheKey);
      const transcriptData = result[cacheKey];

      if (transcriptData && this.isDataValid(transcriptData)) {
        // Update local cache
        this.cache.set(cacheKey, transcriptData);
        return { success: true, data: transcriptData };
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('Error loading transcript:', error);
      return { success: false, error: error.message };
    }
  }

  // Save generated notes
  async saveNotes(videoId, notes, videoInfo = null, isEdited = false) {
    try {
      const notesData = {
        notes: notes,
        videoInfo: videoInfo,
        timestamp: Date.now(),
        version: '1.0',
        isEdited: isEdited,
        lastEditTime: isEdited ? Date.now() : null
      };

      const cacheKey = `notes_${videoId}`;

      // Save to Chrome storage
      await chrome.storage.local.set({
        [cacheKey]: notesData
      });

      // Update local cache
      this.cache.set(cacheKey, notesData);

      console.log('NotesStorageManager: Notes saved for video:', videoId, isEdited ? '(edited)' : '(generated)');
      return { success: true };

    } catch (error) {
      console.error('NotesStorageManager: Error saving notes:', error);
      return { success: false, error: error.message };
    }
  }

  // Load notes from storage
  async loadNotes(videoId) {
    try {
      // Check local cache first
      const cacheKey = `notes_${videoId}`;
      if (this.cache.has(cacheKey)) {
        const cachedData = this.cache.get(cacheKey);
        if (this.isDataValid(cachedData)) {
          return { success: true, data: cachedData };
        } else {
          this.cache.delete(cacheKey);
        }
      }

      // Load from Chrome storage
      const result = await chrome.storage.local.get(cacheKey);
      const notesData = result[cacheKey];

      if (notesData && this.isDataValid(notesData)) {
        // Update local cache
        this.cache.set(cacheKey, notesData);
        return { success: true, data: notesData };
      }

      return { success: false, error: 'No notes found' };
    } catch (error) {
      console.error('NotesStorageManager: Error loading notes:', error);
      return { success: false, error: error.message };
    }
  }

  // Save user settings
  async saveSettings(settings) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: settings
      });

      if (response.success) {
        // Update local cache
        this.cache.set('user_settings', settings);
        return { success: true };
      }

      return { success: false, error: 'Failed to save settings' };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Load user settings
  async loadSettings() {
    try {
      // Check local cache first
      if (this.cache.has('user_settings')) {
        return { success: true, data: this.cache.get('user_settings') };
      }

      // Load from Chrome storage
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SETTINGS'
      });

      if (response.success) {
        // Update local cache
        this.cache.set('user_settings', response.settings);
        return { success: true, data: response.settings };
      }

      return { success: false, error: 'Failed to load settings' };
    } catch (error) {
      console.error('Error loading settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Save API key
  async saveApiKey(apiKey) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_API_KEY',
        apiKey: apiKey
      });

      return response;
    } catch (error) {
      console.error('Error saving API key:', error);
      return { success: false, error: error.message };
    }
  }

  // Load API key
  async loadApiKey() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_API_KEY'
      });

      return response;
    } catch (error) {
      console.error('Error loading API key:', error);
      return { success: false, error: error.message };
    }
  }

  // Clear all cached data
  async clearCache() {
    try {
      // Clear local cache
      this.cache.clear();

      // Clear Chrome storage cache
      const response = await chrome.runtime.sendMessage({
        type: 'CLEAR_CACHE'
      });

      return response;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return { success: false, error: error.message };
    }
  }

  // Get cache statistics
  getCacheStats() {
    const stats = {
      totalItems: this.cache.size,
      notes: 0,
      transcripts: 0,
      settings: 0,
      other: 0
    };

    for (const key of this.cache.keys()) {
      if (key.startsWith('notes_')) {
        stats.notes++;
      } else if (key.startsWith('transcript_')) {
        stats.transcripts++;
      } else if (key === 'user_settings') {
        stats.settings++;
      } else {
        stats.other++;
      }
    }

    return stats;
  }

  // Check if cached data is still valid
  isDataValid(data) {
    if (!data || !data.timestamp) {
      return false;
    }

    const age = Date.now() - data.timestamp;
    return age < this.cacheExpiry;
  }

  // Clean up old cache entries
  cleanupCache() {
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }

    // Convert cache to array and sort by timestamp
    const entries = Array.from(this.cache.entries())
      .map(([key, value]) => ({ key, value, timestamp: value.timestamp || 0 }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries
    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    for (const entry of toRemove) {
      this.cache.delete(entry.key);
    }
  }

  // Export data for backup
  async exportData() {
    try {
      const allData = {};

      // Get all Chrome storage data
      const chromeData = await chrome.storage.local.get();
      const syncData = await chrome.storage.sync.get();

      allData.local = chromeData;
      allData.sync = syncData;
      allData.exportDate = new Date().toISOString();

      return { success: true, data: allData };
    } catch (error) {
      console.error('Error exporting data:', error);
      return { success: false, error: error.message };
    }
  }

  // Import data from backup
  async importData(data) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid import data');
      }

      // Import local storage data
      if (data.local) {
        await chrome.storage.local.set(data.local);
      }

      // Import sync storage data
      if (data.sync) {
        await chrome.storage.sync.set(data.sync);
      }

      // Clear local cache to force reload
      this.cache.clear();

      return { success: true };
    } catch (error) {
      console.error('Error importing data:', error);
      return { success: false, error: error.message };
    }
  }

  // Get storage usage information
  async getStorageUsage() {
    try {
      const localUsage = await chrome.storage.local.getBytesInUse();
      const syncUsage = await chrome.storage.sync.getBytesInUse();

      return {
        success: true,
        usage: {
          local: {
            used: localUsage,
            quota: chrome.storage.local.QUOTA_BYTES || 5242880, // 5MB default
            percentage: (localUsage / (chrome.storage.local.QUOTA_BYTES || 5242880)) * 100
          },
          sync: {
            used: syncUsage,
            quota: chrome.storage.sync.QUOTA_BYTES || 102400, // 100KB default
            percentage: (syncUsage / (chrome.storage.sync.QUOTA_BYTES || 102400)) * 100
          }
        }
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { success: false, error: error.message };
    }
  }
}

// Make NotesStorageManager available globally
if (typeof window !== 'undefined') {
  window.NotesStorageManager = NotesStorageManager;
}

} // End of NotesStorageManager declaration guard
