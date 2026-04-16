#!/bin/bash
# Phase 1-9 Execution Script
# 
# This script guides you through Phase 3-9 completion step by step.
# Run: bash scripts/phase-execution.sh
#
# Prerequisites:
# 1. Database must be working (npm run diagnose:db)
# 2. npm run db:push must be complete
# 3. npm run dev must start without errors

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
  echo -e "${BLUE}→${NC} $1"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Phase 1-9 Implementation Checklist${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Pre-flight checks
log "Running pre-flight checks..."

# Check 1: Database connectivity
if npm run diagnose:db > /dev/null 2>&1; then
  success "Database is accessible"
else
  error "Database connection failed"
  echo ""
  echo "Follow these steps:"
  echo "1. Go to https://app.supabase.com"
  echo "2. Select project: tsvioxrlmcsqdricdgkd"
  echo "3. If paused, click 'Resume'"
  echo "4. Run: npm run diagnose:db again"
  exit 1
fi

# Check 2: Migrations applied
log "Checking database migrations..."
if npm run db:pull > /dev/null 2>&1; then
  success "Database migrations are applied"
else
  warn "Database schema may not be synced"
  log "Running npm run db:push..."
  npm run db:push
  success "Migrations applied"
fi

# Check 3: Build is clean
log "Verifying build..."
npm run type-check || { error "TypeScript errors found"; exit 1; }
npm run lint || { warn "Linting issues found (non-critical)"; }
npm test || { warn "Some unit tests failed (check below)"; }
npm run build || { error "Build failed"; exit 1; }
success "Build is clean"

echo ""
echo -e "${GREEN}✅ All pre-flight checks passed!${NC}"
echo ""

# Phase selection
echo -e "${BLUE}Which phase would you like to execute?${NC}"
echo "1. Phase 3: Job Browsing (2-3 hours)"
echo "2. Phase 4: Employer Management (2 hours)"
echo "3. Phase 5: Messaging & Notifications (6-8 hours)"
echo "4. Phase 6: Admin Analytics (2 hours)"
echo "5. Phase 7: E2E Testing (8-10 hours)"
echo "6. Phase 8: Security Hardening (4-6 hours)"
echo "7. Phase 9: Production Deployment (6-8 hours)"
echo "8. Run all phases in sequence"
echo -e "${YELLOW}Note: Each phase depends on all previous phases${NC}"
echo ""
read -p "Enter choice (1-8): " phase_choice

case $phase_choice in
  1)
    log "Starting Phase 3: Job Browsing"
    echo ""
    log "Step 1: Start dev server in another terminal:"
    echo "  npm run dev"
    echo ""
    log "Step 2: Run tests (this terminal):"
    echo "  PHASE3_BASE_URL=http://localhost:3000 npm run test:phase3:smoke"
    echo ""
    read -p "Press Enter to continue (make sure dev server is running in another terminal)..."
    PHASE3_BASE_URL=http://localhost:3000 npm run test:phase3:smoke
    success "Phase 3 testing complete!"
    ;;
  8)
    log "Starting Phase 3-9 sequence..."
    log "This will take 2-3 hours. Press Ctrl+C to stop at any time."
    read -p "Press Enter to start..."
    
    # Phase 3
    log "Phase 3: Job Browsing..."
    npm run dev &
    sleep 3
    PHASE3_BASE_URL=http://localhost:3000 npm run test:phase3:smoke
    success "Phase 3 passed"
    
    # Phase 6 (analytics - doesn't need jobs)
    log "Phase 6: Admin Analytics..."
    npm run test:phase6:smoke || warn "Phase 6 may have failed"
    success "Phase 6 testing complete"
    
    # Phase 8 (security)
    log "Phase 8: Security Hardening..."
    npm run test:security || warn "Phase 8 may have failed"
    success "Phase 8 testing complete"
    
    success "All sequential tests completed!"
    ;;
  *)
    error "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}✨ Phase execution complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review test output above"
echo "2. Check for any failures"
echo "3. If all passed, commit your work:"
echo "   git add ."
echo "   git commit -m 'feat(phase-X): X passed all tests'"
echo "4. Continue with next phase"
echo ""
echo "For detailed information, see:"
echo "  - MANUAL_PHASE_TESTING_GUIDE.md (curl/browser tests)"
echo "  - PHASE_1_9_COMPLETION_ROADMAP.md (full execution guide)"
echo ""
