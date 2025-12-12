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

# Start with title page
cat > "$TEMP_MD" << 'EOF'
---
title: "Project Online to Smartsheet Migration Guide"
author: "Migration Tool Documentation"
date: "December 2024"
toc: true
toc-depth: 2
numbersections: true
geometry: margin=1in
fontsize: 11pt
---

\newpage

EOF

# Function to add a document with page break
add_document() {
    local file=$1
    local title=$2
    
    echo "  Adding: $title"
    
    # Add section header
    echo "" >> "$TEMP_MD"
    echo "\\newpage" >> "$TEMP_MD"
    echo "" >> "$TEMP_MD"
    echo "# $title" >> "$TEMP_MD"
    echo "" >> "$TEMP_MD"
    
    # Add file content, removing the navigation tables and horizontal rules at start/end
    sed -e '1,/^---$/d' -e '/^---$/,/^<div align="center">$/d' "$file" | \
    sed '/^<div align="center">$/,/^<\/div>$/d' >> "$TEMP_MD"
    
    echo "" >> "$TEMP_MD"
}

# Add all documents in order
add_document "sdlc/docs/architecture/01-project-online-migration-overview.md" "Migrating from Project Online to Smartsheet"
add_document "sdlc/docs/architecture/02-etl-system-design.md" "System Design"
add_document "sdlc/docs/architecture/03-data-transformation-guide.md" "How Your Data Transforms"
add_document "sdlc/docs/project/Template-Based-Workspace-Creation.md" "Using Workspace Templates"
add_document "sdlc/docs/project/Re-run-Resiliency.md" "Safe Re-runs"
add_document "sdlc/docs/project/Sheet-References.md" "How Sheets Connect to Each Other"
add_document "sdlc/docs/project/Authentication-Setup.md" "Setting Up Authentication"
add_document "sdlc/docs/project/CLI-Usage-Guide.md" "Using the Migration Tool"
add_document "sdlc/docs/code/troubleshooting-playbook.md" "Troubleshooting Common Issues"
add_document "sdlc/docs/code/conventions.md" "Code Conventions (Developer Documentation)"
add_document "sdlc/docs/code/patterns.md" "Code Patterns (Developer Documentation)"
add_document "sdlc/docs/code/anti-patterns.md" "Anti-Patterns (Developer Documentation)"
add_document "sdlc/docs/api-reference/api-services-catalog.md" "API Services Reference (Developer Documentation)"
add_document "test/README.md" "Test Suite (Developer Documentation)"

echo ""
echo "📄 Generating PDF with pandoc..."

# Generate PDF using pandoc
pandoc "$TEMP_MD" \
    -o "$OUTPUT_PDF" \
    --pdf-engine=xelatex \
    --toc \
    --toc-depth=2 \
    --number-sections \
    --highlight-style=tango \
    -V linkcolor:blue \
    -V geometry:margin=1in \
    -V fontsize=11pt \
    -V mainfont="Arial" \
    -V monofont="Courier New" \
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