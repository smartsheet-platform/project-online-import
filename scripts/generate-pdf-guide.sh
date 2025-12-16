#!/bin/bash

# Generate a single PDF from all markdown documentation files
# Requires: pandoc and a LaTeX distribution (for PDF generation)

set -e

echo "📚 Generating PDF Guide from Markdown Documentation"
echo ""

# Check if pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo "❌ Error: pandoc is not installed"
    echo ""
    echo "Install pandoc:"
    echo "  macOS:   brew install pandoc"
    echo "  macOS:   brew install --cask mactex  # For LaTeX (large download)"
    echo "  Ubuntu:  sudo apt-get install pandoc texlive-latex-base texlive-fonts-recommended"
    echo "  Windows: choco install pandoc miktex"
    echo ""
    echo "Or download from: https://pandoc.org/installing.html"
    exit 1
fi

# Create output directory
OUTPUT_DIR="sdlc/docs/output"
mkdir -p "$OUTPUT_DIR"

# Output PDF filename
OUTPUT_PDF="$OUTPUT_DIR/Project-Online-Migration-Guide.pdf"

# Temporary concatenated markdown file
TEMP_MD="$OUTPUT_DIR/temp-combined.md"

echo "📝 Combining markdown files..."

# Start with YAML metadata - disable default title to use custom title page
cat > "$TEMP_MD" << 'EOF'
---
title: ""
author: ""
date: ""
toc: true
toc-depth: 2
numbersections: true
---

EOF

# Function to add a chapter header
add_chapter() {
    local title=$1
    echo "  Adding chapter: $title"
    echo "" >> "$TEMP_MD"
    echo "\\newpage" >> "$TEMP_MD"
    echo "" >> "$TEMP_MD"
    echo "# $title" >> "$TEMP_MD"
    echo "" >> "$TEMP_MD"
}

# Function to add a document section
add_document() {
    local file=$1
    local title=$2
    
    echo "    Adding: $title"
    
    # Add section header
    echo "" >> "$TEMP_MD"
    echo "## $title" >> "$TEMP_MD"
    echo "" >> "$TEMP_MD"
    
    # Add file content - remove ALL H1 and H2 headings, demote H3+ headings
    # This prevents duplicate entries in TOC - only our section title appears
    sed -e '1,/^---$/d' \
        -e '/^<div align="center".*style=/,/^<\/div>$/d' \
        -e '/^<div align="center">$/,/^<\/div>$/d' \
        -e '/^---$/,/^<div align="center">$/d' \
        "$file" | \
    # Remove ALL H1 and H2 headings completely, demote H3→H3, H4→H4, etc.
    sed -e '/^# /d' \
        -e '/^## /d' >> "$TEMP_MD"
    
    echo "" >> "$TEMP_MD"
}

# CHAPTER 1: 🎯 Migrating to Smartsheet
echo ""
echo "🎯 Adding Chapter 1: Migrating to Smartsheet"
add_chapter "Migrating to Smartsheet"
add_document "sdlc/docs/architecture/project-online-migration-overview.md" "Migrating from Project Online to Smartsheet"
add_document "sdlc/docs/architecture/etl-system-design.md" "System Design"
add_document "sdlc/docs/architecture/data-transformation-guide.md" "How Your Data Transforms"

# CHAPTER 2: 🏗️ How it Works
echo ""
echo "🏗️ Adding Chapter 2: How it Works"
add_chapter "How it Works"
add_document "sdlc/docs/architecture/Factory-Pattern-Design.md" "Workspace Creation Options"
add_document "sdlc/docs/project/Template-Based-Workspace-Creation.md" "Using Workspace Templates"
add_document "sdlc/docs/project/Re-run-Resiliency.md" "Safe Re-runs"
add_document "sdlc/docs/project/Sheet-References.md" "How Sheets Connect"
add_document "sdlc/docs/project/Authentication-Setup.md" "Setting Up Authentication"
add_document "sdlc/docs/project/CLI-Usage-Guide.md" "Using the Migration Tool"
add_document "sdlc/docs/code/troubleshooting-playbook.md" "Troubleshooting Common Issues"

echo ""
echo "📄 Generating PDF with pandoc..."

# Path to custom header includes
HEADER_FILE="$OUTPUT_DIR/custom-header.tex"

# Generate PDF using pandoc with custom header includes
# Font configuration is in custom-header.tex
pandoc "$TEMP_MD" \
    -o "$OUTPUT_PDF" \
    --pdf-engine=xelatex \
    --include-in-header="$HEADER_FILE" \
    --toc \
    --toc-depth=2 \
    --number-sections \
    --highlight-style=tango \
    -V documentclass=report \
    -V fontsize=9pt \
    -V monofont="Courier New" \
    -V geometry:margin=1in \
    -V colorlinks=true \
    -V linkcolor=blue \
    --listings \
    2>/dev/null

# Check if PDF was created successfully
if [ -f "$OUTPUT_PDF" ]; then
    # Clean up temporary file
    rm "$TEMP_MD"
    
    echo ""
    echo "✅ PDF generated successfully!"
    echo "📍 Location: $OUTPUT_PDF"
    echo "📊 File size: $(du -h "$OUTPUT_PDF" | cut -f1)"
    echo ""
    echo "You can open it with:"
    echo "  open \"$OUTPUT_PDF\"    # macOS"
    echo "  xdg-open \"$OUTPUT_PDF\" # Linux"
    echo "  start \"$OUTPUT_PDF\"   # Windows"
else
    echo ""
    echo "❌ PDF generation failed"
    echo "Check that you have a LaTeX distribution installed (required for PDF output)"
    exit 1
fi