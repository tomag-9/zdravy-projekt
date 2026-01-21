#!/bin/bash
# Validate CI/CD pipeline configuration before pushing

set -e

echo "🔍 Validating CI/CD Pipeline Configuration"
echo "==========================================="

ERRORS=0
WARNINGS=0

# 1. Check if required files exist
echo ""
echo "1️⃣ Checking required files..."
FILES=(
    ".github/workflows/staging.yml"
    "docker-compose.staging.yml"
    "nginx/staging.conf"
    ".env.staging.example"
    "backend/Dockerfile"
    "frontend/Dockerfile"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file missing"
        ((ERRORS++))
    fi
done

# 2. Validate docker-compose syntax
echo ""
echo "2️⃣ Validating docker-compose.staging.yml syntax..."
if docker compose -f docker-compose.staging.yml config > /dev/null 2>&1; then
    echo "   ✅ Compose file syntax is valid"
else
    echo "   ❌ Compose file has syntax errors:"
    docker compose -f docker-compose.staging.yml config
    ((ERRORS++))
fi

# 3. Check compose file uses prebuilt images (not build)
echo ""
echo "3️⃣ Verifying compose uses registry images..."
if grep -q "image:.*REGISTRY_URL.*backend:staging" docker-compose.staging.yml && \
   grep -q "image:.*REGISTRY_URL.*frontend:staging" docker-compose.staging.yml; then
    echo "   ✅ Uses prebuilt images from registry"
else
    echo "   ❌ Compose file should use \${REGISTRY_URL}/zdravy-projekt-backend:staging"
    ((ERRORS++))
fi

if grep -q "build:" docker-compose.staging.yml; then
    echo "   ⚠️  WARNING: 'build:' section found - should only use 'image:'"
    ((WARNINGS++))
fi

# 4. Check nginx config syntax
echo ""
echo "4️⃣ Validating nginx configuration..."
# Basic syntax check - look for common issues
if grep -q "listen.*80" nginx/staging.conf && \
   grep -q "server_name" nginx/staging.conf && \
   grep -q "location" nginx/staging.conf; then
    echo "   ✅ Nginx config has basic structure"
else
    echo "   ❌ Nginx config missing required directives"
    ((ERRORS++))
fi

# 5. Validate GitHub Actions workflow
echo ""
echo "5️⃣ Validating GitHub Actions workflow..."

# Check for checkout on self-hosted runners (should NOT exist)
if grep -A 20 "runs-on:.*self-hosted" .github/workflows/staging.yml | grep -q "actions/checkout"; then
    echo "   ❌ CRITICAL: Checkout found on self-hosted runner!"
    echo "      Self-hosted runners should NOT checkout code"
    ((ERRORS++))
else
    echo "   ✅ No checkout on self-hosted runners"
fi

# Check workflow uses correct compose file
if grep -q "docker-compose.staging.yml" .github/workflows/staging.yml; then
    echo "   ✅ Workflow uses docker-compose.staging.yml"
else
    echo "   ⚠️  Workflow should explicitly use -f docker-compose.staging.yml"
    ((WARNINGS++))
fi

# Check for registry login
if grep -q "docker/login-action" .github/workflows/staging.yml; then
    echo "   ✅ Registry login configured"
else
    echo "   ❌ Missing registry login step"
    ((ERRORS++))
fi

# Check for buildx cache
if grep -q "cache-from:" .github/workflows/staging.yml && grep -q "cache-to:" .github/workflows/staging.yml; then
    echo "   ✅ Build cache configured"
else
    echo "   ⚠️  Build cache not configured (slower builds)"
    ((WARNINGS++))
fi

# 6. Check Dockerfile existence
echo ""
echo "6️⃣ Checking Dockerfiles..."
for df in backend/Dockerfile frontend/Dockerfile; do
    if [ -f "$df" ]; then
        echo "   ✅ $df exists"
    else
        echo "   ❌ $df missing"
        ((ERRORS++))
    fi
done

# 7. Verify environment variables in compose
echo ""
echo "7️⃣ Verifying required environment variables..."
REQUIRED_ENV_VARS=(
    "REGISTRY_URL"
    "DJANGO_SECRET_KEY"
    "POSTGRES_DB"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "STAGING_HOST"
    "VITE_API_URL"
)

for var in "${REQUIRED_ENV_VARS[@]}"; do
    if grep -q "\${${var}}" docker-compose.staging.yml; then
        echo "   ✅ $var referenced in compose"
    else
        echo "   ⚠️  $var not found in compose file"
        ((WARNINGS++))
    fi
done

# 8. Check .env.staging.example has all vars
echo ""
echo "8️⃣ Checking .env.staging.example completeness..."
for var in "${REQUIRED_ENV_VARS[@]}"; do
    if grep -q "^${var}=" .env.staging.example; then
        echo "   ✅ $var in example"
    else
        echo "   ❌ $var missing from .env.staging.example"
        ((ERRORS++))
    fi
done

# 9. Check staging domain configuration
echo ""
echo "9️⃣ Verifying staging domain (zb.tomag.xyz)..."
if grep -q "zb.tomag.xyz" nginx/staging.conf; then
    echo "   ✅ Domain configured in nginx"
else
    echo "   ❌ Domain zb.tomag.xyz not in nginx/staging.conf"
    ((ERRORS++))
fi

if grep -q "zb.tomag.xyz" .github/workflows/staging.yml; then
    echo "   ✅ Domain in workflow environment URL"
else
    echo "   ⚠️  Domain not in workflow URL"
    ((WARNINGS++))
fi

# 10. Port configuration check
echo ""
echo "🔟 Checking port configuration..."
if grep -q '"2010:80"' docker-compose.staging.yml; then
    echo "   ✅ Port 2010 exposed for Cloudflare"
else
    echo "   ❌ Port 2010 not exposed in compose file"
    ((ERRORS++))
fi

# 11. Summary and GitHub setup instructions
echo ""
echo "==========================================="
echo "📊 Validation Summary"
echo "==========================================="
echo "   Errors:   $ERRORS"
echo "   Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo "❌ Pipeline validation FAILED"
    echo ""
    echo "Fix the errors above before pushing to develop branch"
    exit 1
fi

echo "✅ Pipeline validation PASSED"
echo ""
echo "==========================================="
echo "📋 GitHub Setup Checklist"
echo "==========================================="
echo ""
echo "Before pushing to 'develop', ensure:"
echo ""
echo "1️⃣  GitHub Repository Secrets (Settings → Secrets → Actions):"
echo "   • REGISTRY_URL (e.g., ghcr.io/your-username)"
echo "   • REGISTRY_USERNAME"
echo "   • REGISTRY_PASSWORD"
echo ""
echo "2️⃣  GitHub Environment (Settings → Environments):"
echo "   • Create 'staging' environment"
echo "   • Environment URL: https://zb.tomag.xyz"
echo ""
echo "3️⃣  Self-hosted Runner (Settings → Actions → Runners):"
echo "   • Install runner on staging server"
echo "   • Labels: self-hosted, Linux, staging"
echo "   • Working directory: /opt/zdravy-projekt"
echo ""
echo "4️⃣  On Staging Server:"
echo "   • Create /opt/zdravy-projekt/.env.staging"
echo "   • Copy docker-compose.staging.yml and nginx/ folder"
echo "   • Ensure Docker is installed and runner can access it"
echo ""
echo "==========================================="
echo "🚀 Ready to Deploy"
echo "==========================================="
echo ""
echo "To trigger staging deploy:"
echo "  git checkout develop"
echo "  git push origin develop"
echo ""
echo "Monitor at:"
echo "  GitHub Actions → Deploy to Staging workflow"
echo "  https://zb.tomag.xyz (after successful deploy)"
echo ""

if [ $WARNINGS -gt 0 ]; then
    echo "⚠️  $WARNINGS warnings detected (non-critical)"
    echo ""
fi
