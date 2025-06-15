// AI processing functionality for generating notes from transcripts

// Prevent redeclaration
if (typeof window.NotesAIProcessor === 'undefined') {

class NotesAIProcessor {
  constructor() {
    this.apiKey = null;
    this.isProcessing = false;
    this.maxTokens = 4000; // Safe limit for most models
    this.model = 'gpt-3.5-turbo-0125'; // Most cost-effective model: $0.50 + $1.50 per 1M tokens
  }

  // Initialize with API key
  async initialize() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_API_KEY' });
      if (response.success && response.apiKey) {
        this.apiKey = response.apiKey;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize AI processor:', error);
      return false;
    }
  }

  // Set API key
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  // Main method to process transcript and generate notes
  async generateNotes(transcript, videoInfo, settings = {}) {
    if (this.isProcessing) {
      throw new Error('AI processing already in progress');
    }

    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript provided');
    }

    this.isProcessing = true;

    try {
      // Prepare transcript text
      const transcriptText = this.prepareTranscriptText(transcript);

      // Split into chunks if too long
      const chunks = this.splitIntoChunks(transcriptText, settings.summaryDepth || 'medium');

      // Process each chunk with progress updates
      const processedChunks = [];
      for (let i = 0; i < chunks.length; i++) {
        // Update progress for long videos
        if (chunks.length > 1) {
          const progress = Math.round(((i + 1) / chunks.length) * 100);
          console.log(`NotesAIProcessor: Processing chunk ${i + 1}/${chunks.length} (${progress}%)`);

          // Try to update UI if possible
          if (typeof window !== 'undefined' && window.ytNotesConverterInstance) {
            window.ytNotesConverterInstance.updateLoadingMessage(
              `Generating AI notes... ${progress}% complete (${i + 1}/${chunks.length} sections)`
            );
          }
        }

        const chunkNotes = await this.processChunk(chunks[i], settings, i, chunks.length, videoInfo);
        processedChunks.push(chunkNotes);
      }

      // Combine and structure notes
      const finalNotes = await this.combineChunks(processedChunks, videoInfo, settings);

      return {
        success: true,
        notes: finalNotes,
        videoInfo: videoInfo,
        settings: settings,
        generatedAt: new Date().toISOString()
      };

    } finally {
      this.isProcessing = false;
    }
  }

  // Prepare transcript text for processing
  prepareTranscriptText(transcript) {
    console.log(`NotesAIProcessor: Preparing transcript with ${transcript.length} segments`);

    const preparedText = transcript.map(segment => {
      const timestamp = segment.timestamp || this.formatTimestamp(segment.start);
      return `[${timestamp}] ${segment.text}`;
    }).join('\n\n');

    console.log(`NotesAIProcessor: Prepared transcript length: ${preparedText.length} characters`);
    return preparedText;
  }

  // Split transcript into manageable chunks
  splitIntoChunks(text, summaryDepth) {
    const maxChunkSize = this.getMaxChunkSize(summaryDepth);
    const chunks = [];

    console.log(`NotesAIProcessor: Text length: ${text.length}, Max chunk size: ${maxChunkSize}`);

    // Try to keep the entire video in one chunk if possible
    if (text.length <= maxChunkSize) {
      console.log('NotesAIProcessor: Processing entire video in single chunk');
      return [text];
    }

    console.log('NotesAIProcessor: Video too long, splitting into chunks');

    // For very long videos, try to split by time-based sections first
    // Look for natural breaks in the content
    const timeBasedSections = this.splitByTimeSegments(text, maxChunkSize);

    if (timeBasedSections.length > 1) {
      console.log(`NotesAIProcessor: Split into ${timeBasedSections.length} time-based sections`);
      return timeBasedSections;
    }

    // Fallback to paragraph-based splitting
    const paragraphs = text.split('\n\n');
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= maxChunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = paragraph;
        } else {
          // Paragraph is too long, split by sentences
          const sentences = paragraph.split(/(?<=[.!?])\s+/);
          for (const sentence of sentences) {
            if ((currentChunk + sentence).length <= maxChunkSize) {
              currentChunk += (currentChunk ? ' ' : '') + sentence;
            } else {
              if (currentChunk) {
                chunks.push(currentChunk);
              }
              currentChunk = sentence;
            }
          }
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    console.log(`NotesAIProcessor: Created ${chunks.length} chunks`);
    return chunks;
  }

  // Split by time segments for better content organization
  splitByTimeSegments(text, maxChunkSize) {
    const chunks = [];
    const lines = text.split('\n\n');
    let currentChunk = '';
    let lastTimestamp = 0;

    for (const line of lines) {
      // Extract timestamp from line
      const timestampMatch = line.match(/\[(\d+):(\d+)(?::(\d+))?\]/);
      if (timestampMatch) {
        const minutes = parseInt(timestampMatch[1]);
        const seconds = parseInt(timestampMatch[2]);
        const currentTime = minutes * 60 + seconds;

        // If we've accumulated enough content or there's a significant time jump
        if (currentChunk.length > maxChunkSize * 0.8 ||
            (currentTime - lastTimestamp > 300 && currentChunk.length > maxChunkSize * 0.5)) { // 5 min gap
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = line;
          }
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + line;
        }
        lastTimestamp = currentTime;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + line;
      }

      // Hard limit check
      if (currentChunk.length > maxChunkSize) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.length > 1 ? chunks : [text];
  }

  // Get maximum chunk size based on summary depth
  // Note: These are character counts, not token counts
  // Increased significantly to handle 15-50+ minute videos
  getMaxChunkSize(summaryDepth) {
    switch (summaryDepth) {
      case 'brief': return 80000;   // Very large for complete long videos
      case 'detailed': return 60000; // Large enough for 30-50 min videos
      default: return 70000; // medium - handle most long videos
    }
  }

  // Estimate token count (rough approximation: 1 token ≈ 4 characters)
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  // Estimate cost for processing (GPT-3.5-turbo-0125 pricing)
  estimateCost(inputTokens, outputTokens = 4000) {
    // GPT-3.5-turbo-0125 pricing: $0.50 input + $1.50 output per 1M tokens
    const inputCost = (inputTokens / 1000000) * 0.50;
    const outputCost = (outputTokens / 1000000) * 1.50;
    return {
      inputCost: inputCost,
      outputCost: outputCost,
      totalCost: inputCost + outputCost,
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      formattedCost: `$${(inputCost + outputCost).toFixed(4)}`
    };
  }

  // Estimate cost for processing (GPT-3.5 Turbo pricing)
  estimateCost(inputTokens, outputTokens = 4000) {
    // GPT-3.5 Turbo pricing: $1.50 input + $2.00 output per 1M tokens
    const inputCost = (inputTokens / 1000000) * 1.50;
    const outputCost = (outputTokens / 1000000) * 2.00;
    return {
      inputCost: inputCost,
      outputCost: outputCost,
      totalCost: inputCost + outputCost,
      inputTokens: inputTokens,
      outputTokens: outputTokens
    };
  }

  // Process a single chunk
  async processChunk(chunk, settings, chunkIndex, totalChunks, videoInfo = null) {
    const prompt = this.buildPrompt(chunk, settings, chunkIndex, totalChunks, videoInfo);
    const estimatedTokens = this.estimateTokens(prompt);
    const costEstimate = this.estimateCost(estimatedTokens);

    console.log(`NotesAIProcessor: Processing chunk ${chunkIndex + 1}/${totalChunks}`);
    console.log(`NotesAIProcessor: Prompt length: ${prompt.length} chars, estimated tokens: ${estimatedTokens}`);
    console.log(`NotesAIProcessor: Estimated cost: ${costEstimate.formattedCost} (Input: ${estimatedTokens} tokens, Output: ~4000 tokens)`);

    // Use most cost-effective models within $2/1M budget
    // gpt-3.5-turbo-0125: $0.50 input + $1.50 output = $2.00 total per 1M tokens
    const modelConfigs = [
      { model: 'gpt-3.5-turbo-0125', maxTokens: 4000 }, // Most cost-effective
      { model: 'gpt-3.5-turbo', maxTokens: 4000 }        // Fallback (should map to 0125)
    ];

    for (const config of modelConfigs) {
      try {
        console.log(`NotesAIProcessor: Trying model: ${config.model} with ${config.maxTokens} max tokens`);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert note-taker who extracts ACTUAL content from video transcripts. You NEVER use generic templates or placeholder content. You focus on the specific information, concepts, and details presented in the video. Always preserve timestamp references and extract real facts, explanations, and examples from the transcript.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: config.maxTokens,
            temperature: 0.1
          })
        });

        if (response.ok) {
          const data = await response.json();
          const result = data.choices[0]?.message?.content || '';
          console.log(`NotesAIProcessor: Successfully processed with ${config.model}`);
          return result;
        } else {
          const errorData = await response.json();
          console.log(`NotesAIProcessor: ${config.model} failed:`, errorData.error?.message);
          if (config === modelConfigs[modelConfigs.length - 1]) {
            // Last model failed
            throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
          }
          // Try next model
          continue;
        }

      } catch (error) {
        console.error(`NotesAIProcessor: Error with ${config.model}:`, error);
        if (config === modelConfigs[modelConfigs.length - 1]) {
          // Last model failed
          throw error;
        }
        // Try next model
        continue;
      }
    }
  }

  // Build prompt based on settings
  buildPrompt(chunk, settings, chunkIndex, totalChunks, videoInfo = null) {
    const summaryDepth = settings.summaryDepth || 'medium';
    const includeTimestamps = settings.includeTimestamps !== false;

    let basePrompt = '';

    // Get base prompt from config
    if (window.YT_NOTES_CONFIG && window.YT_NOTES_CONFIG.PROMPTS) {
      switch (summaryDepth) {
        case 'brief':
          basePrompt = window.YT_NOTES_CONFIG.PROMPTS.BRIEF;
          break;
        case 'detailed':
          basePrompt = window.YT_NOTES_CONFIG.PROMPTS.DETAILED;
          break;
        default:
          basePrompt = window.YT_NOTES_CONFIG.PROMPTS.MEDIUM;
      }
    }

    let prompt = basePrompt + '\n\n';

    // Add video context
    if (videoInfo && videoInfo.title) {
      prompt += `VIDEO TITLE: "${videoInfo.title}"\n`;
      prompt += `VIDEO URL: ${videoInfo.url}\n\n`;
      prompt += `This is a transcript from the above video. Extract the ACTUAL content being discussed, taught, or demonstrated in this specific video.\n\n`;
    }

    if (totalChunks > 1) {
      prompt += `This is part ${chunkIndex + 1} of ${totalChunks} from the video transcript. Please focus on the content in this section while keeping in mind this is part of a larger video.\n\n`;
    } else {
      prompt += `This is the COMPLETE transcript of the entire video. Please create comprehensive notes covering ALL the content presented in this video.\n\n`;
    }

    if (!includeTimestamps) {
      prompt += 'Note: Remove timestamp references from the final notes.\n\n';
    }

    prompt += 'VIDEO TRANSCRIPT:\n' + chunk;

    return prompt;
  }

  // Combine processed chunks into final notes
  async combineChunks(chunks, videoInfo, settings) {
    if (chunks.length === 1) {
      return this.formatFinalNotes(chunks[0], videoInfo, settings);
    }

    // If multiple chunks, combine them intelligently
    const combinedContent = chunks.join('\n\n---\n\n');

    const combinePrompt = `
You are combining detailed note sections from a complete video transcript into one comprehensive document.

CRITICAL REQUIREMENTS:
- Maintain ALL timestamp references exactly as provided
- Preserve ALL content - do not remove any details
- Create logical flow while keeping complete information
- Organize into clear hierarchical structure
- Remove only true duplicates, not similar content

Video Title: ${videoInfo.title}

Note sections to combine:
${combinedContent}

Create a final comprehensive note document with:
1. Complete hierarchical structure (Main Topics → Subtopics → Details)
2. ALL timestamp references preserved [MM:SS] or [HH:MM:SS]
3. Logical topic grouping that follows the video's progression
4. ALL examples, explanations, and details maintained
5. Clear section headers and organization
6. No loss of educational content or context

IMPORTANT: This should be a complete, detailed study guide covering the entire video.
`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert editor who combines and organizes notes into coherent documents.'
            },
            {
              role: 'user',
              content: combinePrompt
            }
          ],
          max_tokens: this.maxTokens,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        // Fallback to simple concatenation if API fails
        return this.formatFinalNotes(combinedContent, videoInfo, settings);
      }

      const data = await response.json();
      const combinedNotes = data.choices[0]?.message?.content || combinedContent;

      return this.formatFinalNotes(combinedNotes, videoInfo, settings);

    } catch (error) {
      console.error('Error combining chunks:', error);
      return this.formatFinalNotes(combinedContent, videoInfo, settings);
    }
  }

  // Format final notes with metadata
  formatFinalNotes(content, videoInfo, settings) {
    const header = `# ${videoInfo.title}\n\n` +
                  `**Video URL:** ${videoInfo.url}\n` +
                  `**Generated:** ${new Date().toLocaleString()}\n` +
                  `**Summary Depth:** ${settings.summaryDepth || 'medium'}\n\n` +
                  `---\n\n`;

    return header + content;
  }

  // Format timestamp for display
  formatTimestamp(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
      return '0:00';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  // Check if API key is valid
  async validateApiKey(apiKey = null) {
    const keyToTest = apiKey || this.apiKey;
    if (!keyToTest) {
      return false;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${keyToTest}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  // Get processing status
  getProcessingStatus() {
    return {
      isProcessing: this.isProcessing,
      hasApiKey: !!this.apiKey
    };
  }
}

// Make NotesAIProcessor available globally
if (typeof window !== 'undefined') {
  window.NotesAIProcessor = NotesAIProcessor;
  // Also keep old name for compatibility
  window.AIProcessor = NotesAIProcessor;
}

} // End of NotesAIProcessor declaration guard
