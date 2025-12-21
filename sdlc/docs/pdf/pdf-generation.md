# Generating PDF from Documentation

This guide explains how to create a single PDF document containing all 14 markdown files from the onboarding sequence.

## Quick Options

### Option 1: Use VS Code Extension (Easiest)

1. Install the "Markdown PDF" extension in VS Code
2. Create a combined markdown file (see below)
3. Right-click the file and select "Markdown PDF: Export (pdf)"

### Option 2: Use Pandoc Script (Best Quality) ⭐ RECOMMENDED

The repository includes a script that generates a professional, branded PDF with:
- **Custom title page** with Smartsheet branding
- **Smartsheet logo** in header and footer
- **Chapter divisions** organizing content into 3 main sections:
  - Architecture & Design
  - User Guide
  - Developer Documentation
- **Table of contents** with page numbers
- **Page headers** with document title
- **Page footers** with Smartsheet logo and page numbers (bottom right)
- **Professional styling** using Smartsheet brand colors

**Requirements:**
- Pandoc
- LaTeX distribution (for PDF generation)

**Installation:**

macOS:
```bash
brew install pandoc
brew install --cask mactex  # Large download (~4GB), but best quality
```

Ubuntu/Linux:
```bash
sudo apt-get install pandoc texlive-latex-base texlive-fonts-recommended
```

Windows:
```bash
choco install pandoc miktex
```

**Generate PDF:**
```bash
cd sdlc/docs/pdf
./generate-pdf-guide.sh
```

Output: `sdlc/docs/pdf/Project-Online-Migration-Guide.pdf`

### Option 3: Online Converters (No Installation)

1. Create combined markdown file (see instructions below)
2. Use an online converter:
   - [Markdown to PDF](https://www.markdowntopdf.com/)
   - [CloudConvert](https://cloudconvert.com/md-to-pdf)
   - [Dillinger](https://dillinger.io/) (export as PDF)

### Option 4: Browser Print (Simple)

1. Open each markdown file in GitHub or GitLab
2. Use browser's Print to PDF feature
3. Combine PDFs using Preview (macOS) or Adobe Acrobat

## Creating a Combined Markdown File

If you want to manually combine all 14 documents:

```bash
# Create output directory
mkdir -p sdlc/docs/output

# Combine all files
cat > sdlc/docs/pdf/Combined-Guide.md << 'HEADER'
# Project Online to Smartsheet Migration Guide

**Complete Documentation Series**

---

HEADER

# Add each document (removing navigation headers/footers)
for file in \
  "sdlc/docs/project/Project-Online-Migration-Overview.md" \
  "sdlc/docs/project/ETL-System-Design.md" \
  "sdlc/docs/project/Data-Transformation-Guide.md" \
  "sdlc/docs/project/Template-Based-Workspace-Creation.md" \
  "sdlc/docs/project/Re-run-Resiliency.md" \
  "sdlc/docs/project/Sheet-References.md" \
  "sdlc/docs/project/Authentication-Setup.md" \
  "sdlc/docs/project/CLI-Usage-Guide.md" \
  "sdlc/docs/code/Troubleshooting-Playbook.md" \
  "sdlc/docs/code/Conventions.md" \
  "sdlc/docs/code/Patterns.md" \
  "sdlc/docs/code/Anti-Patterns.md" \
  "sdlc/docs/api-reference/API-Services-Catalog.md" \
  "test/README.md"
do
  echo "" >> sdlc/docs/output/Combined-Guide.md
  echo "---" >> sdlc/docs/output/Combined-Guide.md
  echo "" >> sdlc/docs/output/Combined-Guide.md
  
  # Remove navigation tables and add content
  sed -e '1,/^---$/d' -e '/^---$/,/^<div align="center">$/d' "$file" | \
  sed '/^<div align="center">$/,/^<\/div>$/d' >> sdlc/docs/output/Combined-Guide.md
done

echo "✅ Combined markdown created: sdlc/docs/output/Combined-Guide.md"
```

## Document Structure

The PDF is organized into three main chapters:

### Chapter 1: Architecture & Design
1. **Migration Overview** - Introduction and concepts
2. **System Design** - Technical architecture
3. **Data Transformation Guide** - How data converts

### Chapter 2: User Guide
4. **Using Workspace Templates** - Template configuration
5. **Safe Re-runs** - Re-run resiliency
6. **Sheet References** - Cross-sheet relationships
7. **Authentication Setup** - Azure AD configuration
8. **CLI Usage Guide** - Command-line reference
9. **Troubleshooting** - Common issues and solutions

### Chapter 3: Developer Documentation
10. **Code Conventions** - Coding standards
11. **Code Patterns** - Implementation patterns
12. **Anti-Patterns** - What to avoid
13. **API Services Reference** - Technical API details
14. **Test Suite Documentation** - Testing framework

## Customizing the PDF

The PDF uses a custom LaTeX header (`sdlc/docs/pdf/custom-header.tex`) with Smartsheet branding. You can customize:

### Script Settings (`sdlc/docs/pdf/generate-pdf-guide.sh`)

**Change PDF filename:**
```bash
OUTPUT_PDF="$OUTPUT_DIR/Your-Custom-Name.pdf"
```

**Table of contents depth:**
- `toc-depth=2` - Include up to heading level 2 (##)
- Change to `3` for more detail, `1` for less

### Header Settings (`sdlc/docs/pdf/custom-header.tex`)

**Brand Colors:**
```latex
\definecolor{smartsheetdarkblue}{RGB}{0,15,51}
\definecolor{smartsheetblue}{RGB}{0,99,190}
```

**Fonts and Spacing:**
- Adjust `\titleformat` commands for chapter/section styling
- Modify `geometry` package settings for margins
- Change `\fancyhead` and `\fancyfoot` for header/footer content

**Title Page:**
- Edit the `\customtitlepage` command to change title page layout
- Modify colors, spacing, and text as needed

## Troubleshooting PDF Generation

### "command not found: pandoc"

Install pandoc using the instructions in Option 2 above.

### "! LaTeX Error: File not found"

You need a LaTeX distribution installed. This is required for PDF generation:

- macOS: `brew install --cask mactex`
- Ubuntu: `sudo apt-get install texlive-latex-base texlive-fonts-recommended`
- Windows: Install MiKTeX from https://miktex.org/

### "PDF generation failed"

Try a simpler PDF engine:
```bash
# Edit the script and change:
--pdf-engine=xelatex
# to:
--pdf-engine=pdflatex
```

Or use one of the alternative options that don't require LaTeX.

## PDF Features

The generated PDF includes:

✅ **Custom title page** with Smartsheet branding and background
✅ **Professional typography** with Smartsheet brand colors
✅ **Chapter organization** dividing content into logical sections
✅ **Table of contents** with clickable page numbers
✅ **Page headers** showing document title
✅ **Page footers** with Smartsheet logo (left) and page numbers (right)
✅ **Syntax highlighting** for code blocks
✅ **Clean content** with navigation elements removed
✅ **Hyperlinked** cross-references and URLs

### Large File Size

The generated PDF may be large if it includes many images or code blocks. To reduce size:

1. Remove developer documentation chapter (Chapter 3)
2. Use a compression tool on the final PDF
3. Consider splitting into multiple smaller PDFs (e.g., separate user guide from developer docs)

## Alternative: Markdown Viewer with Print

If you have a markdown viewer that supports CSS:

1. Open the combined markdown file in the viewer
2. Use custom CSS for print styling
3. Print to PDF from your browser

This can provide good results without installing additional tools.

---

**Questions?** If you encounter issues with any of these methods, check that all markdown files are valid and don't have syntax errors that might prevent conversion.