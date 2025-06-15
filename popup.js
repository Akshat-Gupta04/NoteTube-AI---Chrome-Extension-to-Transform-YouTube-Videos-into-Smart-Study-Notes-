// Popup functionality for YouTube Notes Converter extension

class PopupManager {
  constructor() {
    this.settings = {};
    this.apiKeyVisible = false;
    this.init();
  }

  async init() {
    try {
      // Load current settings
      await this.loadSettings();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load cache statistics
      await this.loadCacheStats();
      
      // Validate API key if present
      await this.validateCurrentApiKey();
      
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showToast('Failed to load settings', 'error');
    }
  }

  // Load settings from storage
  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) {
        this.settings = response.settings;
        this.populateForm();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Populate form with current settings
  populateForm() {
    const elements = {
      'summary-depth': this.settings.summaryDepth || 'medium',
      'include-timestamps': this.settings.includeTimestamps !== false,
      'auto-generate': this.settings.autoGenerate || false,
      'export-format': this.settings.exportFormat || 'markdown',
      'theme': this.settings.theme || 'light'
    };

    for (const [id, value] of Object.entries(elements)) {
      const element = document.getElementById(id);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = value;
        } else {
          element.value = value;
        }
      }
    }
  }

  // Set up event listeners
  setupEventListeners() {
    // API Key toggle
    document.getElementById('toggle-api-key')?.addEventListener('click', () => {
      this.toggleApiKeyVisibility();
    });

    // Save settings
    document.getElementById('save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Reset settings
    document.getElementById('reset-settings')?.addEventListener('click', () => {
      this.resetSettings();
    });

    // Clear cache
    document.getElementById('clear-cache')?.addEventListener('click', () => {
      this.clearCache();
    });

    // API key validation on blur
    document.getElementById('api-key')?.addEventListener('blur', () => {
      this.validateApiKey();
    });

    // Toast close
    document.getElementById('toast-close')?.addEventListener('click', () => {
      this.hideToast();
    });

    // Help and feedback links
    document.getElementById('help-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openHelpPage();
    });

    document.getElementById('feedback-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openFeedbackPage();
    });

    // Load API key on popup open
    this.loadApiKey();
  }

  // Toggle API key visibility
  toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('api-key');
    const toggleButton = document.getElementById('toggle-api-key');
    
    if (apiKeyInput && toggleButton) {
      this.apiKeyVisible = !this.apiKeyVisible;
      apiKeyInput.type = this.apiKeyVisible ? 'text' : 'password';
      toggleButton.textContent = this.apiKeyVisible ? '🙈' : '👁️';
    }
  }

  // Load API key from storage
  async loadApiKey() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_API_KEY' });
      if (response.success && response.apiKey) {
        const apiKeyInput = document.getElementById('api-key');
        if (apiKeyInput) {
          apiKeyInput.value = response.apiKey;
        }
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  }

  // Validate current API key
  async validateCurrentApiKey() {
    const apiKeyInput = document.getElementById('api-key');
    if (apiKeyInput && apiKeyInput.value) {
      await this.validateApiKey();
    }
  }

  // Validate API key
  async validateApiKey() {
    const apiKeyInput = document.getElementById('api-key');
    const statusElement = document.getElementById('api-key-status');
    
    if (!apiKeyInput || !statusElement) return;

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      statusElement.className = 'status-message';
      statusElement.style.display = 'none';
      return;
    }

    try {
      // Show validating status
      statusElement.className = 'status-message';
      statusElement.textContent = 'Validating API key...';
      statusElement.style.display = 'block';

      // Validate with OpenAI
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        statusElement.className = 'status-message success';
        statusElement.textContent = '✓ API key is valid';
      } else {
        statusElement.className = 'status-message error';
        statusElement.textContent = '✗ Invalid API key';
      }
    } catch (error) {
      statusElement.className = 'status-message error';
      statusElement.textContent = '✗ Unable to validate API key';
    }
  }

  // Save settings
  async saveSettings() {
    try {
      this.showLoading(true);

      // Collect form data
      const formData = {
        summaryDepth: document.getElementById('summary-depth')?.value || 'medium',
        includeTimestamps: document.getElementById('include-timestamps')?.checked !== false,
        autoGenerate: document.getElementById('auto-generate')?.checked || false,
        exportFormat: document.getElementById('export-format')?.value || 'markdown',
        theme: document.getElementById('theme')?.value || 'light'
      };

      // Save settings
      const settingsResponse = await chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: formData
      });

      if (!settingsResponse.success) {
        throw new Error('Failed to save settings');
      }

      // Save API key if provided
      const apiKey = document.getElementById('api-key')?.value.trim();
      if (apiKey) {
        const apiResponse = await chrome.runtime.sendMessage({
          type: 'SAVE_API_KEY',
          apiKey: apiKey
        });

        if (!apiResponse.success) {
          throw new Error('Failed to save API key');
        }
      }

      this.settings = formData;
      this.showToast('Settings saved successfully!', 'success');

    } catch (error) {
      console.error('Error saving settings:', error);
      this.showToast('Failed to save settings', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // Reset settings to defaults
  async resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    try {
      this.showLoading(true);

      const defaultSettings = {
        summaryDepth: 'medium',
        includeTimestamps: true,
        autoGenerate: false,
        exportFormat: 'markdown',
        theme: 'light'
      };

      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: defaultSettings
      });

      if (response.success) {
        this.settings = defaultSettings;
        this.populateForm();
        
        // Clear API key input
        const apiKeyInput = document.getElementById('api-key');
        if (apiKeyInput) {
          apiKeyInput.value = '';
        }
        
        // Clear API key status
        const statusElement = document.getElementById('api-key-status');
        if (statusElement) {
          statusElement.style.display = 'none';
        }

        this.showToast('Settings reset to defaults', 'success');
      } else {
        throw new Error('Failed to reset settings');
      }

    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showToast('Failed to reset settings', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // Load cache statistics
  async loadCacheStats() {
    try {
      // Get storage usage
      const localUsage = await chrome.storage.local.getBytesInUse();
      const allData = await chrome.storage.local.get();
      
      // Count cached notes
      const notesCount = Object.keys(allData).filter(key => key.startsWith('notes_')).length;
      
      // Update UI
      const notesCountEl = document.getElementById('cached-notes-count');
      const storageUsageEl = document.getElementById('storage-usage');
      
      if (notesCountEl) {
        notesCountEl.textContent = notesCount.toString();
      }
      
      if (storageUsageEl) {
        const usageKB = Math.round(localUsage / 1024);
        storageUsageEl.textContent = `${usageKB} KB`;
      }

    } catch (error) {
      console.error('Error loading cache stats:', error);
    }
  }

  // Clear cache
  async clearCache() {
    if (!confirm('Are you sure you want to clear all cached notes and transcripts?')) {
      return;
    }

    try {
      this.showLoading(true);

      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' });
      
      if (response.success) {
        this.showToast(`Cleared ${response.clearedItems} cached items`, 'success');
        await this.loadCacheStats(); // Refresh stats
      } else {
        throw new Error('Failed to clear cache');
      }

    } catch (error) {
      console.error('Error clearing cache:', error);
      this.showToast('Failed to clear cache', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // Show loading overlay
  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !show);
    }
  }

  // Show toast notification
  showToast(message, type = 'info') {
    const toast = document.getElementById('status-toast');
    const messageEl = document.getElementById('toast-message');
    
    if (toast && messageEl) {
      messageEl.textContent = message;
      toast.className = `status-toast ${type}`;
      toast.classList.remove('hidden');

      // Auto-hide after 3 seconds
      setTimeout(() => {
        this.hideToast();
      }, 3000);
    }
  }

  // Hide toast notification
  hideToast() {
    const toast = document.getElementById('status-toast');
    if (toast) {
      toast.classList.add('hidden');
    }
  }

  // Open help page
  openHelpPage() {
    chrome.tabs.create({
      url: 'https://github.com/your-username/youtube-notes-converter#readme'
    });
  }

  // Open feedback page
  openFeedbackPage() {
    chrome.tabs.create({
      url: 'https://github.com/your-username/youtube-notes-converter/issues'
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
