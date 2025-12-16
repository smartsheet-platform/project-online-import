#!/bin/bash

# PMO Standards Test Diagnostics Runner
# Runs the PMO Standards integration test suite multiple times to collect failure data
#
# Usage:
#   ./scripts/run-pmo-standards-diagnostics.sh [num_runs]
#
# Example:
#   ./scripts/run-pmo-standards-diagnostics.sh 20
#
# Output: Creates test-diagnostics/ directory with:
#   - Individual test run logs
#   - Summary report with failure analysis
#   - Aggregated failure patterns

set -e

# Configuration
NUM_RUNS=${1:-20}
OUTPUT_DIR="test-diagnostics"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RUN_DIR="${OUTPUT_DIR}/run_${TIMESTAMP}"
SUMMARY_FILE="${RUN_DIR}/summary.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create output directory
mkdir -p "${RUN_DIR}"

# Initialize summary
cat > "${SUMMARY_FILE}" << EOF
PMO Standards Test Diagnostics
===============================
Started: $(date)
Number of runs: ${NUM_RUNS}
Test command: npm test -- test/integration/pmo-standards-integration.test.ts

EOF

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PMO Standards Test Diagnostics${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Number of runs: ${NUM_RUNS}"
echo -e "Output directory: ${RUN_DIR}"
echo -e "${BLUE}========================================${NC}\n"

# Counters
PASS_COUNT=0
FAIL_COUNT=0

# Files to track test-specific failures (bash 3.x compatible)
TEST_FAILURES_FILE="${RUN_DIR}/.test_failures.tmp"
ERROR_TYPES_FILE="${RUN_DIR}/.error_types.tmp"
touch "${TEST_FAILURES_FILE}" "${ERROR_TYPES_FILE}"

# Run tests multiple times
for ((i=1; i<=NUM_RUNS; i++)); do
    RUN_LOG="${RUN_DIR}/run_${i}.log"
    
    echo -e "${YELLOW}Run ${i}/${NUM_RUNS}${NC} - $(date +"%H:%M:%S")"
    
    # Run test with diagnostics enabled
    if TEST_DIAGNOSTICS=true npm test -- test/integration/pmo-standards-integration.test.ts > "${RUN_LOG}" 2>&1; then
        ((PASS_COUNT++))
        echo -e "  ${GREEN}✓ PASS${NC}"
        echo "Run ${i}: PASS" >> "${SUMMARY_FILE}"
    else
        ((FAIL_COUNT++))
        echo -e "  ${RED}✗ FAIL${NC}"
        echo "Run ${i}: FAIL" >> "${SUMMARY_FILE}"
        
        # Extract failed test names
        FAILED_TESTS=$(grep -E "● PMO Standards" "${RUN_LOG}" | sed 's/● //' || echo "Unknown test")
        echo "  Failed tests:" >> "${SUMMARY_FILE}"
        echo "${FAILED_TESTS}" | while IFS= read -r line; do
            if [ -n "$line" ]; then
                echo "    - ${line}" >> "${SUMMARY_FILE}"
                # Track failures per test (bash 3.x compatible)
                echo "$line" >> "${TEST_FAILURES_FILE}"
            fi
        done
        
        # Extract error messages
        ERROR_MSG=$(grep -A 5 "Error:" "${RUN_LOG}" | head -n 6 || echo "No error message found")
        echo "  Error:" >> "${SUMMARY_FILE}"
        echo "${ERROR_MSG}" | sed 's/^/    /' >> "${SUMMARY_FILE}"
        
        # Categorize error types (bash 3.x compatible)
        if echo "${ERROR_MSG}" | grep -q "404"; then
            echo "404_Not_Found" >> "${ERROR_TYPES_FILE}"
        elif echo "${ERROR_MSG}" | grep -q "timeout"; then
            echo "Timeout" >> "${ERROR_TYPES_FILE}"
        elif echo "${ERROR_MSG}" | grep -q "ECONNREFUSED"; then
            echo "Connection_Refused" >> "${ERROR_TYPES_FILE}"
        else
            echo "Other" >> "${ERROR_TYPES_FILE}"
        fi
        
        echo "" >> "${SUMMARY_FILE}"
    fi
    
    # Small delay between runs to avoid API rate limiting
    if [ $i -lt $NUM_RUNS ]; then
        sleep 2
    fi
done

# Generate summary report
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Results Summary${NC}"
echo -e "${BLUE}========================================${NC}"

cat >> "${SUMMARY_FILE}" << EOF

========================================
Final Summary
========================================
Total runs: ${NUM_RUNS}
Passes: ${PASS_COUNT} ($(awk "BEGIN {printf \"%.1f\", ${PASS_COUNT}/${NUM_RUNS}*100}")%)
Failures: ${FAIL_COUNT} ($(awk "BEGIN {printf \"%.1f\", ${FAIL_COUNT}/${NUM_RUNS}*100}")%)

EOF

echo -e "Total runs: ${NUM_RUNS}"
echo -e "${GREEN}Passes: ${PASS_COUNT}${NC} ($(awk "BEGIN {printf \"%.1f\", ${PASS_COUNT}/${NUM_RUNS}*100}")%)"
echo -e "${RED}Failures: ${FAIL_COUNT}${NC} ($(awk "BEGIN {printf \"%.1f\", ${FAIL_COUNT}/${NUM_RUNS}*100}")%)"

if [ ${FAIL_COUNT} -gt 0 ]; then
    echo -e "\n${YELLOW}Failure Analysis:${NC}"
    echo "" >> "${SUMMARY_FILE}"
    echo "Failure Analysis:" >> "${SUMMARY_FILE}"
    echo "=================" >> "${SUMMARY_FILE}"
    
    # Test-specific failure counts (bash 3.x compatible)
    if [ -s "${TEST_FAILURES_FILE}" ]; then
        echo -e "\n${YELLOW}Tests that failed:${NC}"
        echo "" >> "${SUMMARY_FILE}"
        echo "Tests that failed:" >> "${SUMMARY_FILE}"
        sort "${TEST_FAILURES_FILE}" | uniq -c | sort -rn | while read count test; do
            pct=$(awk "BEGIN {printf \"%.1f\", ${count}/${FAIL_COUNT}*100}")
            echo -e "  • ${test}: ${count} times (${pct}% of failures)"
            echo "  - ${test}: ${count} times (${pct}% of failures)" >> "${SUMMARY_FILE}"
        done
    fi
    
    # Error type breakdown (bash 3.x compatible)
    if [ -s "${ERROR_TYPES_FILE}" ]; then
        echo -e "\n${YELLOW}Error types:${NC}"
        echo "" >> "${SUMMARY_FILE}"
        echo "Error types:" >> "${SUMMARY_FILE}"
        sort "${ERROR_TYPES_FILE}" | uniq -c | sort -rn | while read count error_type; do
            pct=$(awk "BEGIN {printf \"%.1f\", ${count}/${FAIL_COUNT}*100}")
            echo -e "  • ${error_type}: ${count} times (${pct}% of failures)"
            echo "  - ${error_type}: ${count} times (${pct}% of failures)" >> "${SUMMARY_FILE}"
        done
    fi
fi

# Cleanup temp files
rm -f "${TEST_FAILURES_FILE}" "${ERROR_TYPES_FILE}"

# Recommendation based on results
echo "" >> "${SUMMARY_FILE}"
echo "Recommendations:" >> "${SUMMARY_FILE}"
echo "===============" >> "${SUMMARY_FILE}"

if [ ${FAIL_COUNT} -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed! No issues detected.${NC}"
    echo "All tests passed! No issues detected." >> "${SUMMARY_FILE}"
elif [ ${FAIL_COUNT} -le 2 ]; then
    echo -e "\n${YELLOW}⚠️  Low failure rate (≤10%). Possible transient issues.${NC}"
    echo "Low failure rate (≤10%). Possible transient issues:" >> "${SUMMARY_FILE}"
    echo "1. Check network stability" >> "${SUMMARY_FILE}"
    echo "2. Review Smartsheet API response times in logs" >> "${SUMMARY_FILE}"
    echo "3. Consider increasing exponential backoff limits" >> "${SUMMARY_FILE}"
elif [ ${FAIL_COUNT} -le 5 ]; then
    echo -e "\n${YELLOW}⚠️  Moderate failure rate (≤25%). Investigate specific patterns.${NC}"
    echo "Moderate failure rate (≤25%). Investigate specific patterns:" >> "${SUMMARY_FILE}"
    echo "1. Review which tests fail most frequently" >> "${SUMMARY_FILE}"
    echo "2. Check for test execution order dependencies" >> "${SUMMARY_FILE}"
    echo "3. Analyze timing patterns in diagnostic logs" >> "${SUMMARY_FILE}"
    echo "4. Consider adding inter-test delays" >> "${SUMMARY_FILE}"
else
    echo -e "\n${RED}❌ High failure rate (>25%). Systematic issue detected.${NC}"
    echo "High failure rate (>25%). Systematic issue detected:" >> "${SUMMARY_FILE}"
    echo "1. Review PMO Standards workspace caching logic" >> "${SUMMARY_FILE}"
    echo "2. Check for workspace cleanup conflicts" >> "${SUMMARY_FILE}"
    echo "3. Validate exponential backoff implementation" >> "${SUMMARY_FILE}"
    echo "4. Consider pre-creating PMO workspace for tests" >> "${SUMMARY_FILE}"
    echo "5. Review memory-bank/pmo-standards-test-analysis.md for detailed analysis" >> "${SUMMARY_FILE}"
fi

echo "" >> "${SUMMARY_FILE}"
echo "Completed: $(date)" >> "${SUMMARY_FILE}"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Diagnostic files saved to:${NC}"
echo -e "${RUN_DIR}"
echo -e "\nView summary:"
echo -e "  ${YELLOW}cat ${SUMMARY_FILE}${NC}"
echo -e "\nView individual run logs:"
echo -e "  ${YELLOW}ls -lh ${RUN_DIR}/${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Exit with failure code if any tests failed
if [ ${FAIL_COUNT} -gt 0 ]; then
    exit 1
else
    exit 0
fi