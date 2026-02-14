# WPS to Markdown Converter

This converter transforms .wps (Microsoft Works) files into Astro-compatible Markdown files for the Poetry Collection.

## Usage

### Converting a Single File or Small Batch

1. Place `.wps` files in the `input/` directory
2. Run the converter:
   ```bash
   node convert.mjs
   ```
3. Converted `.md` files will appear in the `output/` directory

### Running Future Batches

**Important**: The converter processes ALL `.wps` files in the `input/` directory each time it runs.

#### Option 1: Process and Clear (Recommended)

1. Place new batch of `.wps` files in `input/`
2. Run converter: `node convert.mjs`
3. Review output files in `output/`
4. Move/copy converted `.md` files to `../../src/content/poetry/`
5. Clear `input/` directory before next batch
6. Clear `output/` directory (optional, or keep as backup)

```bash
# Example workflow
cd apps/dad-site/converter
# Add files to input/
node convert.mjs
# Review output
cp output/*.md ../src/content/poetry/
# Clean up for next batch
rm input/*.wps
rm output/*.md  # optional
```

#### Option 2: Organize by Batch

Create subdirectories for each batch:

```bash
# Structure
converter/
  batches/
    batch-2024-01/
      input/
      output/
    batch-2024-02/
      input/
      output/
```

Process each batch separately and maintain history.

### After Conversion

1. **Review generated files** in `output/` directory
2. **Verify tags** - may need manual adjustment based on poem content
3. **Check excerpts** - ensure they end naturally
4. **Validate frontmatter** - especially dates and titles
5. **Test stanza breaks** - ensure blank lines are appropriate
6. **Move to content directory**: Copy validated `.md` files to `apps/dad-site/src/content/poetry/`

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
