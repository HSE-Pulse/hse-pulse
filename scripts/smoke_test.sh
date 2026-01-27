#!/bin/bash
# Smoke Test Script for Healthcare ML Portfolio
# Run after docker-compose up to verify all services are healthy

set -e

BASE_URL="${BASE_URL:-http://localhost:8080}"
TIMEOUT=5
PASSED=0
FAILED=0

echo "========================================"
echo "Healthcare ML Portfolio - Smoke Tests"
echo "========================================"
echo "Base URL: $BASE_URL"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

check_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_status=${3:-200}

    printf "Testing %-30s ... " "$name"

    status_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$BASE_URL$endpoint" 2>/dev/null || echo "000")

    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC} (HTTP $status_code)"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} (Expected $expected_status, got $status_code)"
        ((FAILED++))
    fi
}

check_json_endpoint() {
    local name=$1
    local endpoint=$2
    local method=${3:-GET}
    local data=$4

    printf "Testing %-30s ... " "$name"

    if [ "$method" == "POST" ]; then
        response=$(curl -s -X POST -H "Content-Type: application/json" -d "$data" --connect-timeout $TIMEOUT "$BASE_URL$endpoint" 2>/dev/null || echo "{}")
    else
        response=$(curl -s --connect-timeout $TIMEOUT "$BASE_URL$endpoint" 2>/dev/null || echo "{}")
    fi

    # Check if response is valid JSON
    if echo "$response" | python3 -c "import sys, json; json.load(sys.stdin)" 2>/dev/null; then
        echo -e "${GREEN}PASS${NC} (Valid JSON)"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} (Invalid JSON response)"
        ((FAILED++))
    fi
}

echo "--- Nginx Proxy ---"
check_endpoint "Nginx Health" "/health"
check_endpoint "Demo UI" "/"

echo ""
echo "--- PulseFlow Service ---"
check_endpoint "PulseFlow Health" "/pulseflow/health"
check_endpoint "PulseFlow Metrics" "/pulseflow/metrics"
check_endpoint "PulseFlow Docs" "/pulseflow/docs"
check_json_endpoint "PulseFlow Hospitals" "/pulseflow/hospitals"
check_json_endpoint "PulseFlow Predict" "/pulseflow/predict" "POST" '{"region":"Dublin North","hospital":"Beaumont Hospital","date":"2024-01-15","forecast_days":7}'

echo ""
echo "--- CarePlanPlus Service ---"
check_endpoint "CarePlanPlus Health" "/careplanplus/health"
check_endpoint "CarePlanPlus Metrics" "/careplanplus/metrics"
check_endpoint "CarePlanPlus Docs" "/careplanplus/docs"
check_json_endpoint "CarePlanPlus Samples" "/careplanplus/sample-diagnoses"
check_json_endpoint "CarePlanPlus Predict" "/careplanplus/predict" "POST" '{"diagnoses":[{"icd_code":"I10","seq_num":1}],"top_k":3}'

echo ""
echo "--- PulseNotes Service ---"
check_endpoint "PulseNotes Health" "/pulsenotes/health"
check_endpoint "PulseNotes Metrics" "/pulsenotes/metrics"
check_endpoint "PulseNotes Docs" "/pulsenotes/docs"
check_json_endpoint "PulseNotes Scenarios" "/pulsenotes/sample-scenarios"
check_json_endpoint "PulseNotes Search" "/pulsenotes/search" "POST" '{"query":"chest pain","top_k":3}'

echo ""
echo "--- MediSync Service ---"
check_endpoint "MediSync Health" "/medisync/health"
check_endpoint "MediSync Metrics" "/medisync/metrics"
check_endpoint "MediSync Docs" "/medisync/docs"
check_json_endpoint "MediSync Scenarios" "/medisync/sample-scenarios"
check_json_endpoint "MediSync Allocate" "/medisync/allocate" "POST" '{"Emergency":{"current_patients":25,"available_beds":30}}'

echo ""
echo "========================================"
echo "Results: $PASSED passed, $FAILED failed"
echo "========================================"

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
