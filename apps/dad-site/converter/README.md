# WPS to Markdown Converter

This converter transforms .wps (Microsoft Works) files into Astro-compatible Markdown files for the Poetry Collection.

## Usage

1. Place `.wps` files in the `input/` directory
2. Run the converter:
   ```bash
   node convert.mjs
   ```
3. Converted `.md` files will appear in the `output/` directory

## Features

- **Automatic text extraction** from .wps files using custom Python parser
- **Stanza detection** via blank lines in source documents  
- **Frontmatter generation** with title, date, tags, and excerpt
- **Proper line formatting** with two spaces at end of lines (except last line of stanza)
- **Apostrophe correction** for common contractions (I've, don't, can't, etc.)
- **Filename normalization** to lowercase with dashes

## Conversion Rules

### Frontmatter Fields

- **title**: Preserved as-is from .wps file (including capitalization)
- **date**: Extracted from document content or metadata (format: YYYY-MM-DD)
- **tags**: Auto-generated based on poem content (max 5 tags)
- **excerpt**: First 140-180 characters, sentence-aware when possible

### Poem Body Formatting

- Every line ends with two spaces (for Markdown line breaks)
- Except: last line of each stanza (no trailing spaces)
- Blank lines between stanzas (preserved from source)
- One blank line at end of file
- Indentation from source is ignored

### Tag Generation

Tags are suggested based on:
- Poem content analysis
- Existing tag library in `apps/dad-site/src/utils/tags.ts`
- Common themes and keywords

## Files

- `convert.mjs` - Main converter script (Node.js)
- `extract-wps-text.py` - Python utility for extracting text from .wps files
- `input/` - Place .wps files here
- `output/` - Converted .md files appear here
- `output/poem-title.md` - Sample expected output format

## Requirements

- Node.js
- Python 3

## Notes

GitHub Copilot Agent may edit and reformat this README as needed.
