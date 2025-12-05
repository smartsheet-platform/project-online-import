#!/bin/bash

# Integration Test Runner
# Runs integration tests with proper environment configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "Integration Test Runner"
echo "=================================="
echo ""

# Check for .env.test file
if [ ! -f .env.test ]; then
    echo -e "${RED}ERROR: .env.test file not found${NC}"
    echo ""
    echo "Please create .env.test from .env.test.example:"
    echo "  cp .env.test.example .env.test"
    echo ""
    echo "Then add your Smartsheet API token to .env.test"
    exit 1
fi

# Load environment variables
echo "Loading environment configuration..."
set -a
source .env.test
set +a

# Verify required variables
if [ -z "$SMARTSHEET_API_TOKEN" ]; then
    echo -e "${RED}ERROR: SMARTSHEET_API_TOKEN not set in .env.test${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment configured${NC}"
echo ""

# Check if specific test file provided
TEST_FILE=${1:-"test/integration"}

# Run tests
echo "Running integration tests: $TEST_FILE"
echo ""

# Set Node options for test execution
export NODE_OPTIONS="--max-old-space-size=4096"

# Run Jest with integration test configuration
npm test -- "$TEST_FILE" \
    --testTimeout=300000 \
    --runInBand \
    --verbose

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Some tests failed${NC}"
    
    if [ "$CLEANUP_TEST_WORKSPACES" = "false" ]; then
        echo ""
        echo -e "${YELLOW}Note: Test workspaces were preserved for debugging${NC}"
        echo "Remember to clean them up manually when done"
    fi
fi

exit $EXIT_CODE