// YouTube transcript extraction functionality

// Prevent redeclaration
if (typeof window.YouTubeTranscriptExtractor === 'undefined') {

class YouTubeTranscriptExtractor {
  constructor() {
    this.videoId = null;
    this.transcript = null;
    this.isExtracting = false;
  }

  // Extract video ID from current YouTube URL
  extractVideoId(url = window.location.href) {
    console.log('YouTubeTranscriptExtractor: Extracting video ID from:', url);

    // Method 1: URL parameters
    try {
      const urlObj = new URL(url);
      if (urlObj.searchParams.has('v')) {
        const videoId = urlObj.searchParams.get('v');
        console.log('YouTubeTranscriptExtractor: Video ID from URL params:', videoId);
        return videoId;
      }
    } catch (error) {
      console.log('YouTubeTranscriptExtractor: URL parsing failed:', error);
    }

    // Method 2: Regex patterns
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/v\/)([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('YouTubeTranscriptExtractor: Video ID from regex:', match[1]);
        return match[1];
      }
    }

    // Method 3: Try to get from page elements
    try {
      const metaTag = document.querySelector('meta[property="og:url"]');
      if (metaTag) {
        const metaUrl = metaTag.getAttribute('content');
        console.log('YouTubeTranscriptExtractor: Trying meta URL:', metaUrl);
        return this.extractVideoId(metaUrl);
      }
    } catch (error) {
      console.log('YouTubeTranscriptExtractor: Meta tag extraction failed:', error);
    }

    console.log('YouTubeTranscriptExtractor: Could not extract video ID');
    return null;
  }

  // Main method to extract transcript
  async extractTranscript(videoId = null) {
    if (this.isExtracting) {
      throw new Error('Transcript extraction already in progress');
    }

    this.isExtracting = true;

    try {
      videoId = videoId || this.extractVideoId();
      if (!videoId) {
        throw new Error('Could not extract video ID from URL');
      }

      this.videoId = videoId;

      // Try multiple extraction methods
      let transcript = await this.tryYouTubeTranscriptAPI(videoId);

      if (!transcript) {
        transcript = await this.tryTranscriptButton();
      }

      if (!transcript) {
        transcript = await this.tryClosedCaptions();
      }

      if (!transcript) {
        throw new Error('No transcript available for this video');
      }

      this.transcript = this.processTranscript(transcript);
      return this.transcript;

    } finally {
      this.isExtracting = false;
    }
  }

  // Method 1: Try YouTube's internal transcript API
  async tryYouTubeTranscriptAPI(videoId) {
    console.log('YouTubeTranscriptExtractor: Trying YouTube transcript API...');

    const apiUrls = [
      // Try different language and format combinations
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3&kind=asr`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-GB&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3`, // No language specified
    ];

    for (const url of apiUrls) {
      try {
        console.log('YouTubeTranscriptExtractor: Trying URL:', url);
        const response = await fetch(url);

        if (response.ok) {
          const text = await response.text();
          console.log('YouTubeTranscriptExtractor: API response received, length:', text.length);

          if (text && text.trim() && !text.includes('error')) {
            try {
              const data = JSON.parse(text);
              const transcript = this.parseYouTubeTranscriptData(data);
              if (transcript && transcript.length > 0) {
                console.log('YouTubeTranscriptExtractor: Successfully parsed transcript, segments:', transcript.length);
                return transcript;
              }
            } catch (parseError) {
              console.log('YouTubeTranscriptExtractor: JSON parse failed:', parseError);
            }
          }
        } else {
          console.log('YouTubeTranscriptExtractor: API response not OK:', response.status);
        }
      } catch (error) {
        console.log('YouTubeTranscriptExtractor: API request failed:', error);
      }
    }

    console.log('YouTubeTranscriptExtractor: All API attempts failed');
    return null;
  }

  // Parse YouTube transcript API response
  parseYouTubeTranscriptData(data) {
    if (!data || !data.events) {
      return null;
    }

    const transcript = [];

    for (const event of data.events) {
      if (event.segs) {
        const startTime = event.tStartMs / 1000; // Convert to seconds
        const duration = event.dDurationMs / 1000;

        let text = '';
        for (const seg of event.segs) {
          if (seg.utf8) {
            text += seg.utf8;
          }
        }

        if (text.trim()) {
          transcript.push({
            start: startTime,
            duration: duration,
            text: text.trim()
          });
        }
      }
    }

    return transcript;
  }

  // Method 2: Try clicking the transcript button and scraping
  async tryTranscriptButton() {
    console.log('YouTubeTranscriptExtractor: Trying transcript button method...');

    try {
      // Look for transcript/captions button with multiple selectors
      const selectors = [
        '[aria-label*="transcript" i]',
        '[aria-label*="Show transcript" i]',
        'button[aria-label*="transcript" i]',
        '.ytd-transcript-search-box-renderer',
        '[data-target-id="engagement-panel-transcript"]',
        'yt-button-renderer[aria-label*="transcript" i]'
      ];

      let transcriptButton = null;
      for (const selector of selectors) {
        transcriptButton = document.querySelector(selector);
        if (transcriptButton) {
          console.log('YouTubeTranscriptExtractor: Found transcript button with selector:', selector);
          break;
        }
      }

      if (!transcriptButton) {
        console.log('YouTubeTranscriptExtractor: No transcript button found');
        return null;
      }

      // Click the button
      console.log('YouTubeTranscriptExtractor: Clicking transcript button...');
      transcriptButton.click();

      // Wait for transcript panel to load
      console.log('YouTubeTranscriptExtractor: Waiting for transcript panel...');
      await this.waitForElement('.ytd-transcript-segment-renderer, .ytd-transcript-body-renderer', 5000);

      // Extract transcript segments
      const segmentSelectors = [
        '.ytd-transcript-segment-renderer',
        '.ytd-transcript-body-renderer .segment',
        '[data-segment-id]'
      ];

      let segments = [];
      for (const selector of segmentSelectors) {
        segments = document.querySelectorAll(selector);
        if (segments.length > 0) {
          console.log('YouTubeTranscriptExtractor: Found segments with selector:', selector, 'count:', segments.length);
          break;
        }
      }

      if (segments.length === 0) {
        console.log('YouTubeTranscriptExtractor: No transcript segments found');
        return null;
      }

      const transcript = [];

      for (const segment of segments) {
        const timeElement = segment.querySelector('[role="button"], .ytd-transcript-segment-renderer button, .segment-timestamp');
        const textElement = segment.querySelector('.segment-text, .ytd-transcript-segment-renderer div:not(button)');

        if (timeElement && textElement) {
          const timeText = timeElement.textContent.trim();
          const text = textElement.textContent.trim();
          const startTime = this.parseTimeString(timeText);

          if (startTime !== null && text) {
            transcript.push({
              start: startTime,
              duration: 0, // Duration not available from this method
              text: text
            });
          }
        }
      }

      console.log('YouTubeTranscriptExtractor: Extracted transcript segments:', transcript.length);
      return transcript.length > 0 ? transcript : null;

    } catch (error) {
      console.log('YouTubeTranscriptExtractor: Transcript button method failed:', error);
      return null;
    }
  }

  // Method 3: Try extracting from closed captions
  async tryClosedCaptions() {
    try {
      // This is a fallback method that tries to extract from video player
      const player = document.querySelector('#movie_player');
      if (!player) {
        return null;
      }

      // Try to access caption tracks (this might not work due to CORS)
      const video = player.querySelector('video');
      if (video && video.textTracks && video.textTracks.length > 0) {
        const track = video.textTracks[0];
        if (track.cues && track.cues.length > 0) {
          const transcript = [];

          for (const cue of track.cues) {
            transcript.push({
              start: cue.startTime,
              duration: cue.endTime - cue.startTime,
              text: cue.text
            });
          }

          return transcript;
        }
      }

      return null;

    } catch (error) {
      console.log('Closed captions method failed:', error);
      return null;
    }
  }

  // Process and clean up transcript
  processTranscript(rawTranscript) {
    if (!rawTranscript || rawTranscript.length === 0) {
      return null;
    }

    // Clean and merge transcript segments
    const processed = rawTranscript.map(segment => ({
      start: Math.round(segment.start * 100) / 100, // Round to 2 decimal places
      duration: segment.duration || 0,
      text: this.cleanText(segment.text),
      timestamp: this.formatTimestamp(segment.start)
    })).filter(segment => segment.text.length > 0);

    // Merge short segments for better readability
    return this.mergeShortSegments(processed);
  }

  // Clean transcript text
  cleanText(text) {
    return text
      .replace(/\[.*?\]/g, '') // Remove [Music], [Applause], etc.
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Format timestamp for display
  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  // Parse time string (e.g., "1:23" or "1:23:45")
  parseTimeString(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // minutes:seconds
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // hours:minutes:seconds
    }
    return null;
  }

  // Merge short segments for better readability
  mergeShortSegments(segments, minLength = 50) {
    const merged = [];
    let currentSegment = null;

    for (const segment of segments) {
      if (!currentSegment) {
        currentSegment = { ...segment };
      } else if (currentSegment.text.length < minLength &&
                 segment.start - currentSegment.start < 30) { // Within 30 seconds
        // Merge with current segment
        currentSegment.text += ' ' + segment.text;
        currentSegment.duration = segment.start + segment.duration - currentSegment.start;
      } else {
        // Start new segment
        merged.push(currentSegment);
        currentSegment = { ...segment };
      }
    }

    if (currentSegment) {
      merged.push(currentSegment);
    }

    return merged;
  }

  // Utility method to wait for element
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

  // Get current transcript
  getCurrentTranscript() {
    return this.transcript;
  }

  // Get video info
  getVideoInfo() {
    const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata');
    const title = titleElement ? titleElement.textContent.trim() : 'Unknown Title';

    return {
      videoId: this.videoId,
      title: title,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  }
}

// Make YouTubeTranscriptExtractor available globally
if (typeof window !== 'undefined') {
  window.YouTubeTranscriptExtractor = YouTubeTranscriptExtractor;
  // Also keep old name for compatibility
  window.TranscriptExtractor = YouTubeTranscriptExtractor;
}

} // End of YouTubeTranscriptExtractor declaration guard
