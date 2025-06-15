// Export functionality for YouTube Notes Converter extension

class ExportManager {
  constructor() {
    this.supportedFormats = ['text', 'markdown', 'pdf'];
  }

  // Main export method
  async exportNotes(notes, videoInfo, format = 'markdown') {
    if (!notes || !videoInfo) {
      throw new Error('Notes and video information are required for export');
    }

    if (!this.supportedFormats.includes(format)) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    try {
      switch (format) {
        case 'text':
          return await this.exportAsText(notes, videoInfo);
        case 'markdown':
          return await this.exportAsMarkdown(notes, videoInfo);
        case 'pdf':
          return await this.exportAsPDF(notes, videoInfo);
        default:
          throw new Error(`Unknown export format: ${format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  // Export as plain text
  async exportAsText(notes, videoInfo) {
    const content = this.convertToPlainText(notes, videoInfo);
    const filename = this.generateFilename(videoInfo, 'txt');

    this.downloadFile(content, filename, 'text/plain');

    return {
      success: true,
      format: 'text',
      filename: filename
    };
  }

  // Export as Markdown
  async exportAsMarkdown(notes, videoInfo) {
    const content = this.formatAsMarkdown(notes, videoInfo);
    const filename = this.generateFilename(videoInfo, 'md');

    this.downloadFile(content, filename, 'text/markdown');

    return {
      success: true,
      format: 'markdown',
      filename: filename
    };
  }

  // Export as PDF
  async exportAsPDF(notes, videoInfo) {
    try {
      const filename = this.generateFilename(videoInfo, 'pdf');

      // Create PDF content using simple text formatting
      const pdfContent = this.formatForPDFDownload(notes, videoInfo);

      // Create blob and download
      const blob = new Blob([pdfContent], { type: 'application/pdf' });

      // For now, we'll create an HTML file that can be printed to PDF
      // This is a simpler approach that works without external libraries
      const htmlContent = this.createPDFHTML(this.formatForPDF(notes, videoInfo), videoInfo);
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(htmlBlob);

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace('.pdf', '.html');
      a.style.display = 'none';

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);

      return {
        success: true,
        format: 'pdf',
        filename: filename.replace('.pdf', '.html'),
        message: 'HTML file downloaded. Open it in browser and use Ctrl+P → Save as PDF.'
      };

    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('PDF export failed: ' + error.message);
    }
  }

  // Format content for PDF download
  formatForPDFDownload(notes, videoInfo) {
    // Convert to plain text format suitable for PDF
    let content = '';

    // Add header
    content += `${videoInfo.title}\n`;
    content += '='.repeat(videoInfo.title.length) + '\n\n';
    content += `Video URL: ${videoInfo.url}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
    content += '-'.repeat(50) + '\n\n';

    // Clean up the notes content
    const cleanNotes = notes
      .replace(/^#{1,6}\s+(.*)$/gm, '$1\n' + '-'.repeat(20)) // Headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/^\s*[-*+]\s+/gm, '• ') // List items
      .replace(/\n{3,}/g, '\n\n'); // Normalize line breaks

    content += cleanNotes;

    return content;
  }

  // Convert notes to plain text
  convertToPlainText(notes, videoInfo) {
    let content = '';

    // Add header
    content += `${videoInfo.title}\n`;
    content += '='.repeat(videoInfo.title.length) + '\n\n';
    content += `Video URL: ${videoInfo.url}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
    content += '-'.repeat(50) + '\n\n';

    // Convert markdown to plain text
    const plainText = notes
      .replace(/^#{1,6}\s+(.*)$/gm, '$1') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/^\s*[-*+]\s+/gm, '• ') // Convert list markers
      .replace(/^\s*\d+\.\s+/gm, '• ') // Convert numbered lists
      .replace(/\n{3,}/g, '\n\n'); // Normalize line breaks

    content += plainText;

    return content;
  }

  // Format as Markdown (ensure proper formatting)
  formatAsMarkdown(notes, videoInfo) {
    let content = '';

    // Add YAML frontmatter
    content += '---\n';
    content += `title: "${videoInfo.title}"\n`;
    content += `video_url: "${videoInfo.url}"\n`;
    content += `generated: "${new Date().toISOString()}"\n`;
    content += `video_id: "${videoInfo.videoId}"\n`;
    content += '---\n\n';

    // Add the notes content
    content += notes;

    // Ensure proper formatting
    content = this.cleanupMarkdown(content);

    return content;
  }

  // Format content for PDF
  formatForPDF(notes, videoInfo) {
    // Convert markdown to HTML for better PDF rendering
    const htmlContent = this.markdownToHTML(notes);

    return {
      title: videoInfo.title,
      url: videoInfo.url,
      generated: new Date().toLocaleString(),
      content: htmlContent
    };
  }

  // Create HTML for PDF generation
  createPDFHTML(content, videoInfo) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${content.title} - Notes</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        .meta {
            color: #666;
            font-size: 14px;
        }
        .meta a {
            color: #3498db;
            text-decoration: none;
        }
        .content h1, .content h2, .content h3 {
            color: #2c3e50;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        .content h1 { font-size: 24px; }
        .content h2 { font-size: 20px; }
        .content h3 { font-size: 18px; }
        .content p {
            margin-bottom: 15px;
        }
        .content ul, .content ol {
            margin-bottom: 15px;
            padding-left: 30px;
        }
        .content li {
            margin-bottom: 5px;
        }
        .timestamp-link {
            color: #3498db;
            font-weight: 500;
            text-decoration: none;
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .header { page-break-after: avoid; }
            h1, h2, h3 { page-break-after: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${content.title}</h1>
        <div class="meta">
            <p><strong>Video URL:</strong> <a href="${content.url}">${content.url}</a></p>
            <p><strong>Generated:</strong> ${content.generated}</p>
        </div>
    </div>
    <div class="content">
        ${content.content}
    </div>
</body>
</html>`;
  }

  // Convert markdown to HTML
  markdownToHTML(markdown) {
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|u|l])/gm, '<p>')
      .replace(/(?<!>)$/gm, '</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, '<span class="timestamp-link">[$1]</span>');
  }

  // Clean up markdown formatting
  cleanupMarkdown(content) {
    return content
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .replace(/^[ \t]+$/gm, '') // Remove whitespace-only lines
      .trim();
  }

  // Generate filename based on video info
  generateFilename(videoInfo, extension) {
    const title = videoInfo.title
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .toLowerCase()
      .substring(0, 50); // Limit length

    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const videoId = videoInfo.videoId || 'unknown';

    return `youtube-notes-${title}-${videoId}-${date}.${extension}`;
  }

  // Download file to user's computer
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up the URL object
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Get available export formats
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  // Validate export parameters
  validateExportParams(notes, videoInfo, format) {
    if (!notes || typeof notes !== 'string') {
      throw new Error('Invalid notes content');
    }

    if (!videoInfo || !videoInfo.title || !videoInfo.url) {
      throw new Error('Invalid video information');
    }

    if (format && !this.supportedFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}`);
    }

    return true;
  }

  // Batch export (multiple formats)
  async batchExport(notes, videoInfo, formats = ['markdown']) {
    const results = [];

    for (const format of formats) {
      try {
        const result = await this.exportNotes(notes, videoInfo, format);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          format: format,
          error: error.message
        });
      }
    }

    return results;
  }
}

// Make ExportManager available globally
if (typeof window !== 'undefined') {
  window.ExportManager = ExportManager;
}

// For Node.js environments (if needed for testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportManager;
}
