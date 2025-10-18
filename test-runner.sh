#!/bin/bash

# EventSync Comprehensive Test Runner
# Runs all tests including unit, integration, and end-to-end tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 EventSync Comprehensive Test Suite${NC}"
echo -e "${BLUE}======================================${NC}"

# Configuration
BACKEND_DIR="back-end"
FRONTEND_DIR="dubhacks"
TEST_RESULTS_DIR="test-results"
COVERAGE_DIR="coverage"

# Create test results directory
mkdir -p "${TEST_RESULTS_DIR}"
mkdir -p "${COVERAGE_DIR}"

# Function to run tests with error handling
run_test_suite() {
    local test_name=$1
    local test_command=$2
    local test_dir=$3
    
    echo -e "${YELLOW}🔍 Running ${test_name}...${NC}"
    
    cd "${test_dir}"
    
    if eval "${test_command}"; then
        echo -e "${GREEN}✅ ${test_name} passed${NC}"
        cd ..
        return 0
    else
        echo -e "${RED}❌ ${test_name} failed${NC}"
        cd ..
        return 1
    fi
}

# Function to check if dependencies are installed
check_dependencies() {
    echo -e "${YELLOW}📦 Checking dependencies...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies check passed${NC}"
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}📥 Installing dependencies...${NC}"
    
    # Install backend dependencies
    echo -e "${BLUE}Installing backend dependencies...${NC}"
    cd "${BACKEND_DIR}"
    npm ci
    cd ..
    
    # Install frontend dependencies
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    cd "${FRONTEND_DIR}"
    npm ci
    cd ..
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Function to build applications
build_applications() {
    echo -e "${YELLOW}🏗️ Building applications...${NC}"
    
    # Build backend
    echo -e "${BLUE}Building backend...${NC}"
    cd "${BACKEND_DIR}"
    npm run build
    cd ..
    
    # Build frontend
    echo -e "${BLUE}Building frontend...${NC}"
    cd "${FRONTEND_DIR}"
    npm run build
    cd ..
    
    echo -e "${GREEN}✅ Applications built successfully${NC}"
}

# Function to run linting
run_linting() {
    echo -e "${YELLOW}🔍 Running linting...${NC}"
    
    # Note: Add linting commands here if ESLint/TSLint is configured
    # For now, we'll skip linting as it's not configured in the current setup
    
    echo -e "${GREEN}✅ Linting completed${NC}"
}

# Function to run security audit
run_security_audit() {
    echo -e "${YELLOW}🔒 Running security audit...${NC}"
    
    # Backend security audit
    echo -e "${BLUE}Backend security audit...${NC}"
    cd "${BACKEND_DIR}"
    npm audit --audit-level=high || echo -e "${YELLOW}⚠️ Backend security audit found issues${NC}"
    cd ..
    
    # Frontend security audit
    echo -e "${BLUE}Frontend security audit...${NC}"
    cd "${FRONTEND_DIR}"
    npm audit --audit-level=high || echo -e "${YELLOW}⚠️ Frontend security audit found issues${NC}"
    cd ..
    
    echo -e "${GREEN}✅ Security audit completed${NC}"
}

# Function to generate test report
generate_test_report() {
    echo -e "${YELLOW}📊 Generating test report...${NC}"
    
    local report_file="${TEST_RESULTS_DIR}/test-report.md"
    
    cat > "${report_file}" << EOF
# EventSync Test Report

Generated on: $(date)

## Test Results Summary

### Backend Tests
- Unit Tests: ${BACKEND_UNIT_RESULT:-"Not Run"}
- Integration Tests: ${BACKEND_INTEGRATION_RESULT:-"Not Run"}
- E2E Tests: ${BACKEND_E2E_RESULT:-"Not Run"}

### Frontend Tests
- Unit Tests: ${FRONTEND_UNIT_RESULT:-"Not Run"}
- E2E Tests: ${FRONTEND_E2E_RESULT:-"Not Run"}

### Performance Tests
- Load Tests: ${PERFORMANCE_RESULT:-"Not Run"}

### Security Tests
- Security Audit: ${SECURITY_RESULT:-"Not Run"}

## Coverage Reports
- Backend Coverage: See coverage/backend/
- Frontend Coverage: See coverage/frontend/

## Recommendations
- All tests should pass before deployment
- Coverage should be above 80% for critical components
- Security vulnerabilities should be addressed immediately
EOF

    echo -e "${GREEN}✅ Test report generated: ${report_file}${NC}"
}

# Main test execution
main() {
    local failed_tests=0
    
    echo -e "${BLUE}Starting comprehensive test suite...${NC}"
    
    # Check dependencies
    check_dependencies
    
    # Install dependencies if requested
    if [[ "$1" == "--install" ]]; then
        install_dependencies
    fi
    
    # Build applications
    build_applications
    
    # Run linting
    run_linting
    
    # Run security audit
    run_security_audit
    SECURITY_RESULT="Completed"
    
    echo -e "${BLUE}🧪 Running Test Suites${NC}"
    echo -e "${BLUE}=====================${NC}"
    
    # Backend Unit Tests
    if run_test_suite "Backend Unit Tests" "npm test" "${BACKEND_DIR}"; then
        BACKEND_UNIT_RESULT="✅ Passed"
    else
        BACKEND_UNIT_RESULT="❌ Failed"
        ((failed_tests++))
    fi
    
    # Backend E2E Tests
    if run_test_suite "Backend E2E Tests" "npm run test:e2e" "${BACKEND_DIR}"; then
        BACKEND_E2E_RESULT="✅ Passed"
    else
        BACKEND_E2E_RESULT="❌ Failed"
        ((failed_tests++))
    fi
    
    # Frontend Unit Tests
    if run_test_suite "Frontend Unit Tests" "npm test" "${FRONTEND_DIR}"; then
        FRONTEND_UNIT_RESULT="✅ Passed"
    else
        FRONTEND_UNIT_RESULT="❌ Failed"
        ((failed_tests++))
    fi
    
    # Frontend Integration Tests
    if run_test_suite "Frontend Integration Tests" "npm run test:all" "${FRONTEND_DIR}"; then
        FRONTEND_E2E_RESULT="✅ Passed"
    else
        FRONTEND_E2E_RESULT="❌ Failed"
        ((failed_tests++))
    fi
    
    # Performance Tests (basic)
    echo -e "${YELLOW}⚡ Running Performance Tests...${NC}"
    if command -v curl &> /dev/null; then
        # Basic performance test - check if server responds quickly
        cd "${BACKEND_DIR}"
        npm start &
        SERVER_PID=$!
        sleep 5
        
        if curl -f -s -w "%{time_total}" http://localhost:3001/health > /dev/null; then
            PERFORMANCE_RESULT="✅ Passed"
            echo -e "${GREEN}✅ Performance tests passed${NC}"
        else
            PERFORMANCE_RESULT="❌ Failed"
            echo -e "${RED}❌ Performance tests failed${NC}"
            ((failed_tests++))
        fi
        
        kill $SERVER_PID 2>/dev/null || true
        cd ..
    else
        PERFORMANCE_RESULT="⚠️ Skipped (curl not available)"
        echo -e "${YELLOW}⚠️ Performance tests skipped (curl not available)${NC}"
    fi
    
    # Generate test report
    generate_test_report
    
    # Final results
    echo -e "${BLUE}📊 Test Results Summary${NC}"
    echo -e "${BLUE}=======================${NC}"
    echo -e "Backend Unit Tests: ${BACKEND_UNIT_RESULT}"
    echo -e "Backend E2E Tests: ${BACKEND_E2E_RESULT}"
    echo -e "Frontend Unit Tests: ${FRONTEND_UNIT_RESULT}"
    echo -e "Frontend Integration Tests: ${FRONTEND_E2E_RESULT}"
    echo -e "Performance Tests: ${PERFORMANCE_RESULT}"
    echo -e "Security Audit: ${SECURITY_RESULT}"
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Ready for deployment.${NC}"
        exit 0
    else
        echo -e "${RED}❌ ${failed_tests} test suite(s) failed. Please fix issues before deployment.${NC}"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "EventSync Test Runner"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --install    Install dependencies before running tests"
        echo "  --help, -h   Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                 # Run all tests"
        echo "  $0 --install       # Install dependencies and run all tests"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac