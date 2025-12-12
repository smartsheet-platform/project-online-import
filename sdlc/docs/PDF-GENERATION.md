# Generating PDF from Documentation

This guide explains how to create a single PDF document containing all 14 markdown files from the onboarding sequence.

## Quick Options

### Option 1: Use VS Code Extension (Easiest)

1. Install the "Markdown PDF" extension in VS Code
2. Create a combined markdown file (see below)
3. Right-click the file and select "Markdown PDF: Export (pdf)"

### Option 2: Use Pandoc Script (Best Quality)

The repository includes a script that generates a professional PDF with table of contents and proper formatting.

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
./scripts/generate-pdf-guide.sh
```

Output: `sdlc/docs/output/Project-Online-Migration-Guide.pdf`

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
cat > sdlc/docs/output/Combined-Guide.md << 'HEADER'
# Project Online to Smartsheet Migration Guide

**Complete Documentation Series**

---

HEADER

# Add each document (removing navigation headers/footers)
for file in \
  "sdlc/docs/architecture/01-project-online-migration-overview.md" \
  "sdlc/docs/architecture/02-etl-system-design.md" \
  "sdlc/docs/architecture/03-data-transformation-guide.md" \
  "sdlc/docs/project/Template-Based-Workspace-Creation.md" \
  "sdlc/docs/project/Re-run-Resiliency.md" \
  "sdlc/docs/project/Sheet-References.md" \
  "sdlc/docs/project/Authentication-Setup.md" \
  "sdlc/docs/project/CLI-Usage-Guide.md" \
  "sdlc/docs/code/troubleshooting-playbook.md" \
  "sdlc/docs/code/conventions.md" \
  "sdlc/docs/code/patterns.md" \
  "sdlc/docs/code/anti-patterns.md" \
  "sdlc/docs/api-reference/api-services-catalog.md" \
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

## Document Order

The PDF includes all 14 documents in sequence:

1. **Migrating from Project Online to Smartsheet** - Overview and introduction
2. **System Design** - How the migration tool works
3. **How Your Data Transforms** - Data conversion specifications
4. **Using Workspace Templates** - Template-based workspace creation
5. **Safe Re-runs** - Re-run resiliency features
6. **How Sheets Connect** - Cross-sheet references
7. **Setting Up Authentication** - Azure Active Directory configuration
8. **Using the Migration Tool** - Command-line usage guide
9. **Troubleshooting** - Common issues and solutions
10. **Code Conventions** - Developer documentation (coding standards)
11. **Code Patterns** - Developer documentation (implementation patterns)
12. **Anti-Patterns** - Developer documentation (what to avoid)
13. **API Services Reference** - Developer documentation (technical API details)
14. **Test Suite** - Developer documentation (testing framework)

## Customizing the PDF

If using the pandoc script, you can customize the output by editing `scripts/generate-pdf-guide.sh`:

**Change PDF filename:**
```bash
OUTPUT_PDF="$OUTPUT_DIR/Your-Custom-Name.pdf"
```

**Adjust formatting:**
- `geometry:margin=1in` - Page margins
- `fontsize=11pt` - Base font size
- `mainfont="Arial"` - Font family

**Table of contents depth:**
- `toc-depth=2` - Include up to heading level 2 (##)
- Change to `3` for more detail, `1` for less

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

### Large File Size

The generated PDF may be large if it includes many images or code blocks. To reduce size:

1. Remove developer documentation sections (documents 10-14)
2. Use a compression tool on the final PDF
3. Consider splitting into multiple smaller PDFs

## Alternative: Markdown Viewer with Print

If you have a markdown viewer that supports CSS:

1. Open the combined markdown file in the viewer
2. Use custom CSS for print styling
3. Print to PDF from your browser

This can provide good results without installing additional tools.

---

**Questions?** If you encounter issues with any of these methods, check that all markdown files are valid and don't have syntax errors that might prevent conversion.