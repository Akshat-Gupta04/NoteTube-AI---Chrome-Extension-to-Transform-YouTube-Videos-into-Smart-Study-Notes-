// Configuration constants for the YouTube Notes Converter extension

// Prevent redeclaration
if (typeof window.YT_NOTES_CONFIG === 'undefined') {

const CONFIG = {
  // Extension settings
  EXTENSION_NAME: 'YouTube Notes Converter',
  VERSION: '1.0.0',

  // UI settings
  SIDEBAR_WIDTH: '400px',
  SIDEBAR_ID: 'yt-notes-sidebar',
  TOGGLE_BUTTON_ID: 'yt-notes-toggle',

  // AI processing settings
  DEFAULT_SUMMARY_DEPTH: 'detailed', // 'brief', 'medium', 'detailed' - default to detailed
  MAX_TRANSCRIPT_LENGTH: 500000, // characters - support very long videos (50+ minutes)
  CHUNK_SIZE: 70000, // characters per AI processing chunk - much larger chunks

  // Storage keys
  STORAGE_KEYS: {
    API_KEY: 'openai_api_key',
    SETTINGS: 'user_settings',
    NOTES_CACHE: 'notes_cache',
    TRANSCRIPT_CACHE: 'transcript_cache'
  },

  // Default user settings
  DEFAULT_SETTINGS: {
    summaryDepth: 'medium',
    includeTimestamps: true,
    autoGenerate: false,
    exportFormat: 'markdown',
    theme: 'light'
  },

  // YouTube selectors and patterns
  YOUTUBE: {
    VIDEO_ID_REGEX: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    PLAYER_SELECTOR: '#movie_player',
    TITLE_SELECTOR: 'h1.ytd-video-primary-info-renderer',
    TRANSCRIPT_BUTTON_SELECTOR: '[aria-label*="transcript" i], [aria-label*="captions" i]'
  },

  // AI prompts
  PROMPTS: {
    BRIEF: `You are analyzing a video transcript to create study notes. Extract the ACTUAL content being taught, not generic templates.

IMPORTANT:
- Focus on the specific subject matter, concepts, and information presented in THIS video
- Do NOT use generic templates or placeholder content
- Extract real facts, explanations, and examples from the transcript
- If it's educational content, focus on what's being taught
- If it's a tutorial, focus on the steps and methods shown
- Include specific details, numbers, formulas, or examples mentioned

Create brief notes with:
- Main concepts actually discussed in the video
- Key facts and information presented
- Important examples or demonstrations shown
- Timestamp references for major points
- Bullet-point format for clarity

Do NOT create generic topic outlines. Extract the REAL content from this specific video.`,

    MEDIUM: `You are analyzing a video transcript to create comprehensive study notes. Extract the ACTUAL content being taught, not generic templates.

IMPORTANT:
- Focus on the specific subject matter, concepts, and information presented in THIS video
- Do NOT use generic templates or placeholder content
- Extract real facts, explanations, examples, and demonstrations from the transcript
- If it's educational content, capture what's being taught with details
- If it's a tutorial, document the actual steps and methods shown
- Include specific details, numbers, formulas, quotes, or examples mentioned

Create organized notes with:
- Main topics and concepts actually discussed
- Detailed explanations of ideas presented
- Specific examples, demonstrations, or case studies shown
- Important terminology and definitions given
- Step-by-step processes if applicable
- Hierarchical structure based on actual content flow
- Timestamp references for easy navigation
- Any visual elements or diagrams described

Do NOT create generic topic outlines. Extract and organize the REAL content from this specific video.`,

    DETAILED: `You are analyzing a video transcript to create comprehensive, detailed study notes. Extract ALL the ACTUAL content being taught throughout the ENTIRE video.

CRITICAL REQUIREMENTS:
- Process the COMPLETE video transcript from start to finish
- Extract EVERY concept, explanation, example, and detail mentioned
- Do NOT use generic templates or placeholder content
- Focus on the specific subject matter presented in THIS video
- Include ALL timestamps with precise timing references
- Document the complete flow and progression of ideas

Create comprehensive detailed notes with:

**STRUCTURE REQUIREMENTS:**
- Clear hierarchical organization (Main Topics → Subtopics → Details)
- Every major concept gets its own section with timestamp
- Include ALL examples, demonstrations, and explanations
- Preserve the logical flow of the video content

**TIMESTAMP REQUIREMENTS:**
- Include timestamp [MM:SS] or [HH:MM:SS] for EVERY major point
- Add timestamps for topic transitions and key concepts
- Use the exact timestamps from the transcript
- Format: [MM:SS] or [HH:MM:SS] depending on video length

**CONTENT REQUIREMENTS:**
- Complete breakdown of ALL topics and concepts discussed
- Detailed explanations with full context from the video
- ALL examples, demonstrations, case studies, or applications shown
- Specific terminology, definitions, formulas, equations, or data mentioned
- Step-by-step processes with complete details
- Direct quotes of important statements or key phrases
- Visual elements, diagrams, or demonstrations described
- Background context and reasoning provided
- Connections between different concepts explained

**COVERAGE REQUIREMENTS:**
- Cover the ENTIRE video duration, not just portions
- Include introduction, main content, and conclusion
- Document all key learning objectives and takeaways
- Capture the complete educational value of the video

Do NOT create generic outlines. Extract and organize ALL the REAL content from this complete video with detailed timestamps.`
  },

  // Export settings
  EXPORT: {
    FORMATS: ['text', 'markdown', 'pdf'],
    FILENAME_PREFIX: 'youtube-notes-',
    DATE_FORMAT: 'YYYY-MM-DD'
  },

  // Error messages
  ERRORS: {
    NO_TRANSCRIPT: 'No transcript available for this video',
    API_KEY_MISSING: 'OpenAI API key not configured',
    PROCESSING_FAILED: 'Failed to process video content',
    EXPORT_FAILED: 'Failed to export notes',
    NETWORK_ERROR: 'Network error occurred'
  }
};

// Make config available globally
if (typeof window !== 'undefined') {
  window.YT_NOTES_CONFIG = CONFIG;
}

// For Node.js environments (if needed for testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

} // End of CONFIG declaration guard
