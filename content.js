// Main content script for YouTube Notes Converter extension

// Prevent redeclaration and multiple initialization
if (typeof window.YouTubeNotesConverter === 'undefined') {

class YouTubeNotesConverter {
  constructor() {
    this.transcriptExtractor = new YouTubeTranscriptExtractor();
    this.aiProcessor = new NotesAIProcessor();
    this.storageManager = new NotesStorageManager();

    this.currentVideoId = null;
    this.sidebar = null;
    this.toggleButton = null;
    this.isInitialized = false;

    // Edit mode state
    this.isEditMode = false;
    this.originalNotesContent = '';
    this.editableContent = null;

    this.init();
  }

  // Initialize the extension
  async init() {
    if (this.isInitialized) return;

    console.log('YouTube Notes Converter: Starting initialization...');

    try {
      // Wait for page to be ready
      if (document.readyState === 'loading') {
        console.log('YouTube Notes Converter: Waiting for DOM to load...');
        document.addEventListener('DOMContentLoaded', () => this.init());
        return;
      }

      console.log('YouTube Notes Converter: DOM ready, checking URL...');
      console.log('Current URL:', window.location.href);

      // Check if we're on a YouTube watch page
      if (!this.isYouTubeWatchPage()) {
        console.log('YouTube Notes Converter: Not on a YouTube watch page, skipping initialization');
        return;
      }

      console.log('YouTube Notes Converter: On YouTube watch page, proceeding...');

      // Wait a bit for YouTube to fully load
      await this.waitForYouTubeLoad();

      // Get current video ID
      this.currentVideoId = this.transcriptExtractor.extractVideoId();
      console.log('YouTube Notes Converter: Current video ID:', this.currentVideoId);

      // Initialize AI processor
      console.log('YouTube Notes Converter: Initializing AI processor...');
      await this.aiProcessor.initialize();

      // Create UI elements
      console.log('YouTube Notes Converter: Creating UI elements...');
      this.createToggleButton();
      this.createSidebar();

      // Set up event listeners
      this.setupEventListeners();

      // Monitor URL changes (for YouTube's SPA navigation)
      this.setupNavigationListener();

      // Check for existing cached notes
      this.checkForCachedNotes();

      this.isInitialized = true;
      console.log('YouTube Notes Converter: Successfully initialized!');

    } catch (error) {
      console.error('YouTube Notes Converter: Failed to initialize:', error);
    }
  }

  // Check if current page is a YouTube watch page
  isYouTubeWatchPage() {
    const isWatchPage = window.location.href.includes('youtube.com/watch') ||
                       window.location.href.includes('youtu.be/');
    console.log('YouTube Notes Converter: Is watch page?', isWatchPage);
    return isWatchPage;
  }

  // Wait for YouTube to fully load
  async waitForYouTubeLoad() {
    console.log('YouTube Notes Converter: Waiting for YouTube to load...');

    // Wait for video player
    await this.waitForElement('#movie_player', 10000);
    console.log('YouTube Notes Converter: Video player found');

    // Wait a bit more for UI to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('YouTube Notes Converter: YouTube should be fully loaded');
  }

  // Create toggle button
  createToggleButton() {
    console.log('YouTube Notes Converter: Creating toggle button...');

    if (this.toggleButton) {
      console.log('YouTube Notes Converter: Removing existing button');
      this.toggleButton.remove();
    }

    this.toggleButton = document.createElement('button');
    this.toggleButton.id = 'yt-notes-toggle';
    this.toggleButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      </svg>
      <span>Notes</span>
    `;
    this.toggleButton.title = 'Generate AI Notes';
    this.toggleButton.className = 'yt-notes-toggle-btn';

    // Add click listener before inserting into DOM
    this.toggleButton.addEventListener('click', (e) => {
      console.log('YouTube Notes Converter: Toggle button clicked');
      e.preventDefault();
      e.stopPropagation();
      this.toggleSidebar();
    });

    // Find a good place to insert the button
    const targetContainer = this.findButtonContainer();
    if (targetContainer) {
      console.log('YouTube Notes Converter: Button container found, adding button');
      targetContainer.appendChild(this.toggleButton);
      console.log('YouTube Notes Converter: Toggle button created successfully');
    } else {
      console.error('YouTube Notes Converter: Could not find suitable container for button');
    }
  }

  // Find appropriate container for the toggle button
  findButtonContainer() {
    console.log('YouTube Notes Converter: Looking for button container...');

    // Try different selectors for different YouTube layouts
    const selectors = [
      '#top-level-buttons-computed',
      '#menu-container',
      '.ytd-video-primary-info-renderer #menu',
      '.ytd-watch-metadata #menu',
      '#actions',
      '.ytd-menu-renderer',
      '#info #menu',
      '.ytd-video-primary-info-renderer .ytd-menu-renderer'
    ];

    for (const selector of selectors) {
      console.log(`YouTube Notes Converter: Trying selector: ${selector}`);
      const container = document.querySelector(selector);
      if (container) {
        console.log(`YouTube Notes Converter: Found container with selector: ${selector}`);
        return container;
      }
    }

    console.log('YouTube Notes Converter: No standard container found, trying fallback options...');

    // Fallback 1: Look for any button container in the video info area
    const videoInfo = document.querySelector('#info, .ytd-watch-metadata, .ytd-video-primary-info-renderer');
    if (videoInfo) {
      const buttonContainer = videoInfo.querySelector('[role="button"], button');
      if (buttonContainer && buttonContainer.parentElement) {
        console.log('YouTube Notes Converter: Using fallback container in video info area');
        return buttonContainer.parentElement;
      }
    }

    // Fallback 2: Create our own container near the video player
    const player = document.querySelector('#movie_player, .html5-video-player');
    if (player) {
      console.log('YouTube Notes Converter: Creating custom container near video player');
      const container = document.createElement('div');
      container.id = 'yt-notes-custom-container';
      container.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1000;
        background: rgba(0,0,0,0.8);
        border-radius: 4px;
        padding: 4px;
      `;
      player.appendChild(container);
      return container;
    }

    // Fallback 3: Create container in document body
    console.log('YouTube Notes Converter: Creating container in document body as last resort');
    const container = document.createElement('div');
    container.id = 'yt-notes-fallback-container';
    container.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 10000;
      background: rgba(0,0,0,0.9);
      border-radius: 4px;
      padding: 8px;
    `;
    document.body.appendChild(container);
    return container;
  }

  // Create sidebar
  createSidebar() {
    if (this.sidebar) {
      this.sidebar.remove();
    }

    this.sidebar = document.createElement('div');
    this.sidebar.id = 'yt-notes-sidebar';
    this.sidebar.className = 'yt-notes-sidebar hidden';

    this.sidebar.innerHTML = `
      <div class="yt-notes-header">
        <h3>AI Notes</h3>
        <div class="yt-notes-controls">
          <button id="yt-notes-settings" title="Settings">⚙️</button>
          <button id="yt-notes-close" title="Close">✕</button>
        </div>
      </div>

      <div class="yt-notes-content">
        <div id="yt-notes-status" class="yt-notes-status">
          <p>Click "Generate Notes" to create AI-powered notes from this video.</p>
        </div>

        <div id="yt-notes-loading" class="yt-notes-loading hidden">
          <div class="loading-spinner"></div>
          <p>Processing video transcript...</p>
        </div>

        <div id="yt-notes-notes" class="yt-notes-notes hidden">
          <div class="yt-notes-toolbar">
            <button id="yt-notes-search-btn">🔍 Search</button>
            <button id="yt-notes-edit-btn">✏️ Edit</button>
            <button id="yt-notes-export-btn">📥 Export</button>
            <button id="yt-notes-regenerate-btn">🔄 Regenerate</button>
          </div>
          <div class="yt-notes-edit-toolbar hidden" id="yt-notes-edit-toolbar">
            <div class="edit-toolbar-left">
              <button id="yt-notes-save-btn" class="btn-primary">💾 Save Changes</button>
              <button id="yt-notes-cancel-btn" class="btn-secondary">❌ Cancel</button>
            </div>
            <div class="edit-toolbar-right">
              <span class="edit-mode-indicator">✏️ Edit Mode</span>
            </div>
          </div>
          <div id="yt-notes-search" class="yt-notes-search hidden">
            <input type="text" placeholder="Search in notes..." id="yt-notes-search-input">
          </div>
          <div id="yt-notes-content" class="yt-notes-markdown"></div>
        </div>

        <div id="yt-notes-error" class="yt-notes-error hidden">
          <p class="error-message"></p>
          <button id="yt-notes-retry">Retry</button>
        </div>
      </div>

      <div class="yt-notes-footer">
        <button id="yt-notes-generate" class="yt-notes-generate-btn">
          Generate Notes
        </button>
      </div>
    `;

    document.body.appendChild(this.sidebar);
  }

  // Set up event listeners
  setupEventListeners() {
    console.log('YouTube Notes Converter: Setting up event listeners...');

    // Toggle button (already has listener from createToggleButton)
    if (this.toggleButton) {
      console.log('YouTube Notes Converter: Toggle button listener already attached');
    }

    // Sidebar controls
    document.getElementById('yt-notes-close')?.addEventListener('click', () => this.hideSidebar());
    document.getElementById('yt-notes-generate')?.addEventListener('click', () => this.generateNotes());
    document.getElementById('yt-notes-retry')?.addEventListener('click', () => this.generateNotes());
    document.getElementById('yt-notes-regenerate-btn')?.addEventListener('click', () => this.regenerateNotes());

    // Search functionality
    document.getElementById('yt-notes-search-btn')?.addEventListener('click', () => this.toggleSearch());
    document.getElementById('yt-notes-search-input')?.addEventListener('input', (e) => this.searchNotes(e.target.value));

    // Edit functionality
    document.getElementById('yt-notes-edit-btn')?.addEventListener('click', () => this.toggleEditMode());
    document.getElementById('yt-notes-save-btn')?.addEventListener('click', () => this.saveEditedNotes());
    document.getElementById('yt-notes-cancel-btn')?.addEventListener('click', () => this.cancelEdit());

    // Export functionality
    document.getElementById('yt-notes-export-btn')?.addEventListener('click', () => this.showExportOptions());

    // Settings
    document.getElementById('yt-notes-settings')?.addEventListener('click', () => this.showSettings());
  }

  // Set up navigation listener for YouTube's SPA
  setupNavigationListener() {
    let lastUrl = location.href;

    const observer = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;

        if (this.isYouTubeWatchPage()) {
          // New video loaded
          setTimeout(() => {
            this.handleVideoChange();
          }, 1000); // Wait for YouTube to load
        } else {
          // Not on watch page, hide sidebar
          this.hideSidebar();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Handle video change
  async handleVideoChange() {
    const newVideoId = this.transcriptExtractor.extractVideoId();

    if (newVideoId !== this.currentVideoId) {
      this.currentVideoId = newVideoId;

      // Reset UI
      this.resetUI();

      // Recreate toggle button if needed
      if (!document.getElementById('yt-notes-toggle')) {
        this.createToggleButton();
      }

      // Check for cached notes
      this.checkForCachedNotes();
    }
  }

  // Check for cached notes
  async checkForCachedNotes() {
    if (!this.currentVideoId) return;

    try {
      const result = await this.storageManager.loadNotes(this.currentVideoId);
      if (result.success && result.data) {
        this.displayCachedNotes(result.data);
      }
    } catch (error) {
      console.error('Error checking cached notes:', error);
    }
  }

  // Display cached notes
  displayCachedNotes(notesData) {
    const statusEl = document.getElementById('yt-notes-status');
    if (statusEl) {
      statusEl.innerHTML = `
        <p>✅ Notes available (generated ${new Date(notesData.timestamp).toLocaleString()})</p>
        <button id="yt-notes-show-cached" class="yt-notes-btn-secondary">Show Cached Notes</button>
      `;

      document.getElementById('yt-notes-show-cached')?.addEventListener('click', () => {
        this.displayNotes(notesData.notes);
      });
    }
  }

  // Toggle sidebar visibility
  toggleSidebar() {
    console.log('YouTube Notes Converter: toggleSidebar called');

    try {
      if (!this.sidebar) {
        console.log('YouTube Notes Converter: Sidebar not found, creating...');
        this.createSidebar();
      }

      if (this.sidebar.classList.contains('hidden')) {
        console.log('YouTube Notes Converter: Showing sidebar');
        this.showSidebar();
      } else {
        console.log('YouTube Notes Converter: Hiding sidebar');
        this.hideSidebar();
      }
    } catch (error) {
      console.error('YouTube Notes Converter: Error in toggleSidebar:', error);
    }
  }

  // Show sidebar
  showSidebar() {
    console.log('YouTube Notes Converter: showSidebar called');
    if (this.sidebar) {
      this.sidebar.classList.remove('hidden');
      document.body.classList.add('yt-notes-sidebar-open');
      console.log('YouTube Notes Converter: Sidebar shown');
    } else {
      console.error('YouTube Notes Converter: Sidebar element not found');
    }
  }

  // Hide sidebar
  hideSidebar() {
    console.log('YouTube Notes Converter: hideSidebar called');
    if (this.sidebar) {
      this.sidebar.classList.add('hidden');
      document.body.classList.remove('yt-notes-sidebar-open');
      console.log('YouTube Notes Converter: Sidebar hidden');
    } else {
      console.error('YouTube Notes Converter: Sidebar element not found');
    }
  }

  // Reset UI state
  resetUI() {
    const elements = ['yt-notes-loading', 'yt-notes-notes', 'yt-notes-error'];
    elements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    const statusEl = document.getElementById('yt-notes-status');
    if (statusEl) {
      statusEl.innerHTML = '<p>Click "Generate Notes" to create AI-powered notes from this video.</p>';
      statusEl.classList.remove('hidden');
    }
  }

  // Generate notes from video
  async generateNotes() {
    console.log('YouTube Notes Converter: generateNotes called');

    // Try to get current video ID
    this.currentVideoId = this.transcriptExtractor.extractVideoId();
    console.log('YouTube Notes Converter: Current video ID:', this.currentVideoId);

    if (!this.currentVideoId) {
      console.error('YouTube Notes Converter: Could not identify current video');
      this.showError('Could not identify current video. Please make sure you are on a YouTube video page.');
      return;
    }

    try {
      this.showLoading('Extracting transcript...');

      // Extract transcript
      const transcript = await this.transcriptExtractor.extractTranscript(this.currentVideoId);
      if (!transcript) {
        throw new Error('No transcript available for this video');
      }

      // Get video info
      const videoInfo = this.transcriptExtractor.getVideoInfo();

      // Save transcript to cache
      await this.storageManager.saveTranscript(this.currentVideoId, transcript, videoInfo);

      this.showLoading('Generating AI notes...');

      // Load user settings
      const settingsResult = await this.storageManager.loadSettings();
      const settings = settingsResult.success ? settingsResult.data : {};

      // Default to detailed mode for comprehensive notes
      if (!settings.summaryDepth) {
        settings.summaryDepth = 'detailed';
      }

      console.log('YouTube Notes Converter: Using settings:', settings);

      // Generate notes using AI
      const result = await this.aiProcessor.generateNotes(transcript, videoInfo, settings);

      if (result.success) {
        // Save notes to cache
        await this.storageManager.saveNotes(this.currentVideoId, result.notes, videoInfo);

        // Display notes
        this.displayNotes(result.notes);
      } else {
        throw new Error('Failed to generate notes');
      }

    } catch (error) {
      console.error('Error generating notes:', error);
      this.showError(error.message);
    }
  }

  // Show loading state
  showLoading(message) {
    this.hideAllStates();
    const loadingEl = document.getElementById('yt-notes-loading');
    if (loadingEl) {
      loadingEl.querySelector('p').textContent = message;
      loadingEl.classList.remove('hidden');
    }
  }

  // Update loading message for long video processing
  updateLoadingMessage(message) {
    const loadingEl = document.getElementById('yt-notes-loading');
    if (loadingEl && !loadingEl.classList.contains('hidden')) {
      loadingEl.querySelector('p').textContent = message;
    }
  }

  // Show error state
  showError(message) {
    this.hideAllStates();
    const errorEl = document.getElementById('yt-notes-error');
    if (errorEl) {
      errorEl.querySelector('.error-message').textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  // Display generated notes
  displayNotes(notes) {
    this.hideAllStates();
    const notesEl = document.getElementById('yt-notes-notes');
    const contentEl = document.getElementById('yt-notes-content');

    if (notesEl && contentEl) {
      // Convert markdown to HTML (basic conversion)
      contentEl.innerHTML = this.markdownToHtml(notes);

      // Make timestamps clickable
      this.makeTimestampsClickable(contentEl);

      notesEl.classList.remove('hidden');
    }
  }

  // Hide all state elements
  hideAllStates() {
    const elements = ['yt-notes-status', 'yt-notes-loading', 'yt-notes-notes', 'yt-notes-error'];
    elements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  // Basic markdown to HTML conversion
  markdownToHtml(markdown) {
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  // Make timestamps clickable
  makeTimestampsClickable(container) {
    const timestampRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;

    container.innerHTML = container.innerHTML.replace(timestampRegex, (match, timestamp) => {
      return `<span class="timestamp-link" data-time="${timestamp}">${match}</span>`;
    });

    // Add click listeners to timestamp links
    container.querySelectorAll('.timestamp-link').forEach(link => {
      link.addEventListener('click', () => {
        const timeStr = link.dataset.time;
        this.seekToTime(timeStr);
      });
    });
  }

  // Seek video to specific time
  seekToTime(timeStr) {
    const seconds = this.parseTimeString(timeStr);
    if (seconds !== null) {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = seconds;
      }
    }
  }

  // Parse time string to seconds
  parseTimeString(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  }

  // Regenerate notes
  async regenerateNotes() {
    // Clear cached notes first
    if (this.currentVideoId) {
      await this.storageManager.saveNotes(this.currentVideoId, null);
    }

    // Generate new notes
    await this.generateNotes();
  }

  // Toggle search
  toggleSearch() {
    const searchEl = document.getElementById('yt-notes-search');
    if (searchEl) {
      searchEl.classList.toggle('hidden');
      if (!searchEl.classList.contains('hidden')) {
        document.getElementById('yt-notes-search-input')?.focus();
      }
    }
  }

  // Search in notes
  searchNotes(query) {
    const contentEl = document.getElementById('yt-notes-content');
    if (!contentEl || !query) {
      // Clear highlights
      contentEl.innerHTML = contentEl.innerHTML.replace(/<mark>(.*?)<\/mark>/g, '$1');
      return;
    }

    // Simple text highlighting
    const regex = new RegExp(`(${query})`, 'gi');
    contentEl.innerHTML = contentEl.innerHTML.replace(regex, '<mark>$1</mark>');
  }

  // Show export options
  showExportOptions() {
    // Create export modal with format options
    this.createExportModal();
  }

  // Create export modal
  createExportModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('yt-notes-export-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'yt-notes-export-modal';
    modal.innerHTML = `
      <div class="yt-notes-modal-overlay">
        <div class="yt-notes-modal-content">
          <div class="yt-notes-modal-header">
            <h3>Export Notes</h3>
            <button id="yt-notes-modal-close">×</button>
          </div>
          <div class="yt-notes-modal-body">
            <p>Choose export format:</p>
            <div class="yt-notes-export-options">
              <button class="yt-notes-export-btn" data-format="markdown">
                📝 Markdown (.md)
              </button>
              <button class="yt-notes-export-btn" data-format="text">
                📄 Plain Text (.txt)
              </button>
              <button class="yt-notes-export-btn" data-format="pdf">
                📋 PDF (.pdf)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal styles
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('yt-notes-modal-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('.yt-notes-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        modal.remove();
      }
    });

    // Add export button listeners
    modal.querySelectorAll('.yt-notes-export-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const format = e.target.dataset.format;
        this.exportNotes(format);
        modal.remove();
      });
    });
  }

  // Export notes in specified format
  async exportNotes(format) {
    try {
      const contentEl = document.getElementById('yt-notes-content');
      if (!contentEl) {
        throw new Error('No notes content found');
      }

      // Get the raw notes content (HTML)
      const notesHTML = contentEl.innerHTML;

      // Convert HTML back to markdown-like format
      const notes = this.htmlToMarkdown(notesHTML);

      // Get video info
      const videoInfo = this.transcriptExtractor.getVideoInfo();

      // Create export manager instance
      const exportManager = new (window.ExportManager || ExportManager)();

      // Export in the specified format
      const result = await exportManager.exportNotes(notes, videoInfo, format);

      console.log('Export successful:', result);

    } catch (error) {
      console.error('Export failed:', error);
      this.showError(`Export failed: ${error.message}`);
    }
  }

  // Convert HTML back to markdown format
  htmlToMarkdown(html) {
    return html
      .replace(/<h1>(.*?)<\/h1>/g, '# $1')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<li>(.*?)<\/li>/g, '- $1')
      .replace(/<br>/g, '\n')
      .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
      .replace(/\n{3,}/g, '\n\n'); // Normalize line breaks
  }

  // Toggle edit mode
  toggleEditMode() {
    if (this.isEditMode) {
      this.exitEditMode();
    } else {
      this.enterEditMode();
    }
  }

  // Enter edit mode
  enterEditMode() {
    console.log('NoteTube AI: Entering edit mode');

    const contentEl = document.getElementById('yt-notes-content');
    const editToolbar = document.getElementById('yt-notes-edit-toolbar');
    const editBtn = document.getElementById('yt-notes-edit-btn');

    if (!contentEl) {
      console.error('NoteTube AI: No notes content to edit');
      return;
    }

    // Store original content
    this.originalNotesContent = contentEl.innerHTML;

    // Convert to editable markdown-like format
    const markdownContent = this.htmlToMarkdown(contentEl.innerHTML);

    // Create editable textarea
    this.editableContent = document.createElement('textarea');
    this.editableContent.className = 'yt-notes-editor';
    this.editableContent.value = markdownContent;
    this.editableContent.placeholder = `Edit your notes here...

📝 EDITING TIPS:
• Add your own insights and observations
• Modify existing content to match your understanding
• Add new sections with ## headings
• Keep timestamp references like [12:34] for navigation
• Use **bold** and *italic* for emphasis
• Create lists with - or *
• Add code snippets with \`backticks\`

💾 Remember to click "Save Changes" when done!`;

    // Replace content with editor
    contentEl.innerHTML = '';
    contentEl.appendChild(this.editableContent);

    // Show edit toolbar and update button
    editToolbar?.classList.remove('hidden');
    if (editBtn) {
      editBtn.textContent = '👁️ Preview';
      editBtn.title = 'Preview changes';
    }

    // Focus on editor
    this.editableContent.focus();

    this.isEditMode = true;
    console.log('NoteTube AI: Edit mode activated');
  }

  // Exit edit mode (preview)
  exitEditMode() {
    console.log('NoteTube AI: Exiting edit mode');

    const contentEl = document.getElementById('yt-notes-content');
    const editToolbar = document.getElementById('yt-notes-edit-toolbar');
    const editBtn = document.getElementById('yt-notes-edit-btn');

    if (!this.editableContent) return;

    // Convert markdown back to HTML and display
    const markdownContent = this.editableContent.value;
    const htmlContent = this.markdownToHtml(markdownContent);

    contentEl.innerHTML = htmlContent;

    // Make timestamps clickable again
    this.makeTimestampsClickable(contentEl);

    // Hide edit toolbar and update button
    editToolbar?.classList.add('hidden');
    if (editBtn) {
      editBtn.textContent = '✏️ Edit';
      editBtn.title = 'Edit notes';
    }

    this.isEditMode = false;
    console.log('NoteTube AI: Edit mode deactivated');
  }

  // Save edited notes
  async saveEditedNotes() {
    console.log('NoteTube AI: Saving edited notes');

    if (!this.editableContent || !this.currentVideoId) {
      console.error('NoteTube AI: Cannot save - no content or video ID');
      return;
    }

    try {
      // Get edited content
      const editedMarkdown = this.editableContent.value;

      // Get video info
      const videoInfo = this.transcriptExtractor.getVideoInfo();

      // Add metadata header
      const notesWithMetadata = this.formatFinalNotes(editedMarkdown, videoInfo, { summaryDepth: 'edited' });

      // Save to storage (mark as edited)
      await this.storageManager.saveNotes(this.currentVideoId, notesWithMetadata, videoInfo, true);

      // Exit edit mode and show saved content
      this.exitEditMode();

      // Show success message
      this.showTemporaryMessage('✅ Notes saved successfully!', 'success');

      console.log('NoteTube AI: Notes saved successfully');

    } catch (error) {
      console.error('NoteTube AI: Error saving notes:', error);
      this.showTemporaryMessage('❌ Failed to save notes', 'error');
    }
  }

  // Cancel edit and revert changes
  cancelEdit() {
    console.log('NoteTube AI: Cancelling edit');

    const contentEl = document.getElementById('yt-notes-content');
    const editToolbar = document.getElementById('yt-notes-edit-toolbar');
    const editBtn = document.getElementById('yt-notes-edit-btn');

    if (!contentEl) return;

    // Restore original content
    contentEl.innerHTML = this.originalNotesContent;

    // Make timestamps clickable again
    this.makeTimestampsClickable(contentEl);

    // Hide edit toolbar and update button
    editToolbar?.classList.add('hidden');
    if (editBtn) {
      editBtn.textContent = '✏️ Edit';
      editBtn.title = 'Edit notes';
    }

    this.isEditMode = false;
    this.editableContent = null;

    console.log('NoteTube AI: Edit cancelled');
  }

  // Show temporary message
  showTemporaryMessage(message, type = 'info') {
    // Create or update message element
    let messageEl = document.getElementById('yt-notes-temp-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'yt-notes-temp-message';
      messageEl.className = 'yt-notes-temp-message';

      const notesEl = document.getElementById('yt-notes-notes');
      if (notesEl) {
        notesEl.insertBefore(messageEl, notesEl.firstChild);
      }
    }

    messageEl.textContent = message;
    messageEl.className = `yt-notes-temp-message ${type}`;
    messageEl.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 3000);
  }

  // Enhanced markdown to HTML conversion
  markdownToHtml(markdown) {
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|u|l])/gm, '<p>')
      .replace(/(?<!>)$/gm, '</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, '<span class="timestamp-link" data-time="$1">[$1]</span>');
  }

  // Format final notes with metadata
  formatFinalNotes(content, videoInfo, settings) {
    const header = `# ${videoInfo.title}\n\n` +
                  `**Video URL:** ${videoInfo.url}\n` +
                  `**Generated:** ${new Date().toLocaleString()}\n` +
                  `**Summary Depth:** ${settings.summaryDepth || 'medium'}\n` +
                  `**Last Edited:** ${new Date().toLocaleString()}\n\n` +
                  `---\n\n`;

    return header + content;
  }

  // Show settings
  showSettings() {
    // This would open the extension popup or a settings modal
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
  }

  // Utility method to wait for element (moved from transcript-extractor)
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
}

// Make YouTubeNotesConverter available globally
window.YouTubeNotesConverter = YouTubeNotesConverter;

} // End of YouTubeNotesConverter declaration guard

// Initialize when DOM is ready with retry mechanism
function initializeExtension() {
  // Prevent multiple instances
  if (window.ytNotesConverterInstance) {
    console.log('YouTube Notes Converter: Already initialized, skipping...');
    return;
  }

  console.log('YouTube Notes Converter: Attempting to initialize...');

  try {
    window.ytNotesConverterInstance = new YouTubeNotesConverter();
  } catch (error) {
    console.error('YouTube Notes Converter: Initialization failed:', error);

    // Retry after a delay
    setTimeout(() => {
      if (!window.ytNotesConverterInstance) {
        console.log('YouTube Notes Converter: Retrying initialization...');
        try {
          window.ytNotesConverterInstance = new YouTubeNotesConverter();
        } catch (retryError) {
          console.error('YouTube Notes Converter: Retry failed:', retryError);
        }
      }
    }, 3000);
  }
}

// Only initialize if not already done
if (!window.ytNotesConverterInstance) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    initializeExtension();
  }

  // Also try to initialize after a delay (for YouTube's dynamic loading)
  setTimeout(() => {
    if (!window.ytNotesConverterInstance) {
      initializeExtension();
    }
  }, 2000);

  setTimeout(() => {
    if (!window.ytNotesConverterInstance) {
      initializeExtension();
    }
  }, 5000);
}
