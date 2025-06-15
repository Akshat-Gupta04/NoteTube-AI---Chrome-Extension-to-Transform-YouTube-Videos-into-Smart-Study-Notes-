# Setup Guide - YouTube Video to Notes Converter

This guide will help you set up and install the YouTube Notes Converter Chrome extension.

## Prerequisites

Before you begin, make sure you have:

1. **Google Chrome Browser** (version 88 or later)
2. **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)
3. **Basic understanding** of Chrome extensions

## Step 1: Prepare the Extension Files

### Option A: Download from GitHub
1. Download or clone this repository
2. Extract the files to a folder on your computer

### Option B: Use the provided files
All necessary files should already be in your current directory.

## Step 2: Generate Icons

The extension needs PNG icons for Chrome. You have two options:

### Option A: Use the Icon Generator (Recommended)
1. Open `create-icons.html` in your browser
2. Click "Generate Icons"
3. Download each generated icon:
   - Save as `icons/icon16.png`
   - Save as `icons/icon48.png` 
   - Save as `icons/icon128.png`

### Option B: Create Icons Manually
Create three PNG files in the `icons/` folder:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Use a simple document icon with blue background (#065fd4) and white document shape.

## Step 3: Install the Extension

1. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/` in Chrome
   - Or: Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the folder containing the extension files
   - The extension should now appear in your extensions list

4. **Pin the Extension** (Optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Pin the "YouTube Notes Converter" extension for easy access

## Step 4: Configure Your API Key

1. **Get OpenAI API Key**
   - Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create an account if you don't have one
   - Generate a new API key
   - Copy the key (you won't be able to see it again)

2. **Add API Key to Extension**
   - Click the extension icon in Chrome toolbar
   - Paste your API key in the "API Key" field
   - Click "Save Settings"
   - The extension will validate your key

## Step 5: Test the Extension

1. **Go to YouTube**
   - Navigate to any YouTube video with captions/subtitles
   - Educational videos work best for testing

2. **Generate Notes**
   - Look for the "Notes" button on the video page
   - Click it to open the sidebar
   - Click "Generate Notes" to test the functionality

3. **Verify Features**
   - Check that notes appear in the sidebar
   - Test timestamp clicking (should jump to video position)
   - Try the search functionality
   - Test export options

## Troubleshooting

### Extension Not Loading
- **Check file structure**: Ensure all files are in the correct locations
- **Check manifest.json**: Verify the file is valid JSON
- **Check console**: Look for errors in Chrome DevTools

### Icons Not Showing
- **Generate PNG icons**: SVG icons won't work, you need PNG files
- **Check file names**: Must be exactly `icon16.png`, `icon48.png`, `icon128.png`
- **Check file paths**: Icons should be in the `icons/` folder

### API Key Issues
- **Verify key format**: Should start with `sk-`
- **Check credits**: Ensure your OpenAI account has available credits
- **Test key**: Use the validation feature in extension settings

### Notes Not Generating
- **Check video captions**: Video must have captions or auto-generated subtitles
- **Check API credits**: Ensure you have sufficient OpenAI credits
- **Check network**: Verify internet connection
- **Check console**: Look for error messages in browser console

### Button Not Appearing
- **Refresh page**: Try refreshing the YouTube page
- **Check URL**: Must be on a video page (`youtube.com/watch?v=...`)
- **Wait for load**: Give YouTube time to fully load before expecting the button

## File Structure

Your extension folder should look like this:

```
youtube-chrome-extension/
├── manifest.json
├── background.js
├── content.js
├── config.js
├── transcript-extractor.js
├── ai-processor.js
├── storage-manager.js
├── export-manager.js
├── popup.html
├── popup.js
├── popup.css
├── sidebar.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── create-icons.html
├── README.md
└── SETUP.md
```

## Configuration Options

### Summary Depth
- **Brief**: Quick key points only
- **Medium**: Balanced detail (recommended)
- **Detailed**: Comprehensive notes (uses more API credits)

### Other Settings
- **Include Timestamps**: Add clickable time references
- **Auto-generate**: Generate notes automatically when videos load
- **Export Format**: Choose default format (Markdown, Text, PDF)

## API Usage and Costs

### Typical Costs
- **Brief notes**: ~$0.01-0.02 per video
- **Medium notes**: ~$0.02-0.05 per video  
- **Detailed notes**: ~$0.05-0.10 per video

### Cost Control Tips
- Use "Brief" mode for cost savings
- Disable auto-generation
- Process shorter videos first
- Monitor your OpenAI usage dashboard

## Security Notes

- **API Key Storage**: Keys are stored locally in Chrome's secure storage
- **Data Privacy**: Transcripts are sent to OpenAI for processing
- **No External Storage**: Notes are stored locally on your device
- **HTTPS Only**: All API communications use secure connections

## Getting Help

If you encounter issues:

1. **Check this guide** for common solutions
2. **Check browser console** for error messages
3. **Verify file structure** matches the expected layout
4. **Test with simple videos** first
5. **Check OpenAI API status** at status.openai.com

## Next Steps

Once installed and configured:

1. **Test with different video types** (lectures, tutorials, podcasts)
2. **Experiment with settings** to find your preferred configuration
3. **Try different export formats** to see what works best for you
4. **Set up keyboard shortcuts** in Chrome extensions settings (optional)

## Updates

To update the extension:

1. Download the latest version
2. Replace the files in your extension folder
3. Go to `chrome://extensions/`
4. Click the refresh icon on the extension card

---

**Congratulations!** Your YouTube Notes Converter extension should now be ready to use. Enjoy turning long videos into concise, organized notes!
