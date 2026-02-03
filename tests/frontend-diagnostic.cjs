#!/usr/bin/env node
/**
 * Blake News Now - Frontend Diagnostic
 *
 * Static analysis of React components for common issues.
 * Run with: node tests/frontend-diagnostic.cjs
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const results = {
  errors: [],
  warnings: [],
  suggestions: [],
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function getFiles(dir, ext = '.tsx') {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...getFiles(fullPath, ext));
    } else if (item.name.endsWith(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

function analyzeComponent(filePath, content) {
  const fileName = path.basename(filePath);
  const issues = [];

  // Check for missing error boundaries
  if (content.includes('fetch(') && !content.includes('catch')) {
    issues.push({
      type: 'warning',
      message: `${fileName}: Fetch calls may not have proper error handling`,
    });
  }

  // Check for console.log in production code
  const consoleMatches = content.match(/console\.(log|debug|info)\(/g);
  if (consoleMatches && consoleMatches.length > 2) {
    issues.push({
      type: 'suggestion',
      message: `${fileName}: Has ${consoleMatches.length} console statements - consider removing for production`,
    });
  }

  // Check for missing key props in maps
  const mapMatches = content.match(/\.map\([^)]+\)\s*=>\s*[^{]*</g);
  if (mapMatches) {
    for (const match of mapMatches) {
      if (!match.includes('key=')) {
        issues.push({
          type: 'error',
          message: `${fileName}: Possible missing key prop in map() rendering`,
        });
        break;
      }
    }
  }

  // Check for accessibility issues
  if (content.includes('<button') && !content.includes('aria-') && !content.includes('title=')) {
    const buttonCount = (content.match(/<button/g) || []).length;
    const accessibleCount = (content.match(/<button[^>]*(aria-|title=)/g) || []).length;
    if (accessibleCount < buttonCount) {
      issues.push({
        type: 'warning',
        message: `${fileName}: ${buttonCount - accessibleCount} buttons may be missing accessibility attributes`,
      });
    }
  }

  // Check for images without alt text
  if (content.includes('<img') && content.includes('alt=""')) {
    issues.push({
      type: 'warning',
      message: `${fileName}: Images with empty alt text - add descriptive alt or aria-hidden`,
    });
  }

  // Check for hardcoded API URLs
  if (content.includes('localhost:3001') && !fileName.includes('test')) {
    issues.push({
      type: 'warning',
      message: `${fileName}: Hardcoded localhost URL - should use environment variable`,
    });
  }

  // Check for missing loading states
  if (content.includes('useState<') && content.includes('fetch(')) {
    if (!content.includes('loading') && !content.includes('Loading') && !content.includes('skeleton')) {
      issues.push({
        type: 'suggestion',
        message: `${fileName}: Fetches data but may not have a loading state`,
      });
    }
  }

  // Check for missing TypeScript types
  if (content.includes(': any')) {
    const anyCount = (content.match(/: any/g) || []).length;
    issues.push({
      type: 'warning',
      message: `${fileName}: Uses 'any' type ${anyCount} times - consider adding proper types`,
    });
  }

  // Check for inline styles (prefer Tailwind)
  if (content.includes('style={{') || content.includes('style={')) {
    const styleCount = (content.match(/style=\{/g) || []).length;
    if (styleCount > 2) {
      issues.push({
        type: 'suggestion',
        message: `${fileName}: Uses ${styleCount} inline styles - consider using Tailwind classes`,
      });
    }
  }

  // Check for magic numbers
  const magicNumbers = content.match(/\b(setInterval|setTimeout)\([^,]+,\s*\d{4,}\)/g);
  if (magicNumbers) {
    issues.push({
      type: 'suggestion',
      message: `${fileName}: Has magic number timeouts - consider using named constants`,
    });
  }

  // Check for proper cleanup in useEffect
  if (content.includes('setInterval(') || content.includes('setTimeout(')) {
    if (!content.includes('clearInterval') && !content.includes('clearTimeout')) {
      issues.push({
        type: 'error',
        message: `${fileName}: Uses interval/timeout without cleanup - potential memory leak`,
      });
    }
  }

  // Check for missing memoization
  if (content.includes('useCallback') === false && content.includes('onClick={') && content.includes('=>')) {
    const inlineHandlers = (content.match(/onClick=\{[^}]*=>/g) || []).length;
    if (inlineHandlers > 3) {
      issues.push({
        type: 'suggestion',
        message: `${fileName}: Has ${inlineHandlers} inline onClick handlers - consider useCallback for performance`,
      });
    }
  }

  // Check for color contrast issues (common dark theme problems)
  if (content.includes('text-white/30') || content.includes('text-white/20')) {
    issues.push({
      type: 'warning',
      message: `${fileName}: Low opacity text (white/20-30) may have contrast issues for accessibility`,
    });
  }

  // Check for missing error states
  if (content.includes('[error,') || content.includes('error,')) {
    if (!content.includes('error ?') && !content.includes('error &&') && !content.includes('{error}')) {
      issues.push({
        type: 'warning',
        message: `${fileName}: Has error state but may not display it to users`,
      });
    }
  }

  return issues;
}

function analyzeHooks(filePath, content) {
  const fileName = path.basename(filePath);
  const issues = [];

  // Check for missing dependencies in useEffect
  const useEffectMatches = content.match(/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\)/g);
  if (useEffectMatches) {
    for (const match of useEffectMatches) {
      // Simple heuristic: if the effect body references a variable not in deps
      const depsMatch = match.match(/\],\s*\[([^\]]*)\]\)/);
      const deps = depsMatch ? depsMatch[1].split(',').map(d => d.trim()) : [];

      // Check for common missing deps
      if (match.includes('settings') && !deps.includes('settings')) {
        issues.push({
          type: 'warning',
          message: `${fileName}: useEffect may be missing 'settings' in dependency array`,
        });
      }
    }
  }

  // Check for useCallback without dependencies
  if (content.includes('useCallback(() =>') && content.includes(', [])')) {
    // This is usually fine, but flag if function uses external values
  }

  return issues;
}

function analyzeStyles(filePath, content) {
  const fileName = path.basename(filePath);
  const issues = [];

  // Check for responsive design
  if (!content.includes('md:') && !content.includes('lg:') && !content.includes('sm:')) {
    if (content.includes('grid') || content.includes('flex')) {
      issues.push({
        type: 'suggestion',
        message: `${fileName}: No responsive breakpoints - may not work well on different screen sizes`,
      });
    }
  }

  // Check for fixed dimensions that might cause overflow
  const fixedWidths = content.match(/w-\[\d+px\]/g);
  const fixedHeights = content.match(/h-\[\d+px\]/g);
  if ((fixedWidths?.length || 0) + (fixedHeights?.length || 0) > 5) {
    issues.push({
      type: 'suggestion',
      message: `${fileName}: Many fixed pixel dimensions - consider using relative units for flexibility`,
    });
  }

  // Check for z-index stacking issues
  const zIndexes = content.match(/z-\d+/g);
  if (zIndexes && zIndexes.length > 3) {
    const values = zIndexes.map(z => parseInt(z.replace('z-', '')));
    const uniqueValues = [...new Set(values)];
    if (uniqueValues.length < values.length) {
      issues.push({
        type: 'warning',
        message: `${fileName}: Multiple elements with same z-index may cause stacking issues`,
      });
    }
  }

  return issues;
}

function analyzeServerCode() {
  const issues = [];

  // Check data-feeds.cjs
  const dataFeeds = readFile(path.join(__dirname, '..', 'server', 'data-feeds.cjs'));
  if (dataFeeds) {
    // Check for proper error handling
    if (!dataFeeds.includes('try {') || dataFeeds.split('try {').length < 5) {
      issues.push({
        type: 'warning',
        message: 'data-feeds.cjs: May need more try/catch blocks for external API calls',
      });
    }

    // Check for rate limiting
    if (!dataFeeds.includes('rate') && !dataFeeds.includes('throttle')) {
      issues.push({
        type: 'suggestion',
        message: 'data-feeds.cjs: No rate limiting - could be blocked by external APIs',
      });
    }

    // Check for request timeouts
    const timeoutMatches = dataFeeds.match(/timeout:\s*\d+/g);
    if (!timeoutMatches || timeoutMatches.length < 3) {
      issues.push({
        type: 'warning',
        message: 'data-feeds.cjs: Some requests may not have explicit timeouts',
      });
    }

    // Check for proper User-Agent headers
    if (!dataFeeds.includes('User-Agent')) {
      issues.push({
        type: 'error',
        message: 'data-feeds.cjs: Missing User-Agent headers - requests may be blocked',
      });
    }

    // Check cache TTLs
    const shortCacheTTLs = dataFeeds.match(/:\s*\d{4},/g); // 4-digit numbers (< 10 seconds)
    if (shortCacheTTLs && shortCacheTTLs.length > 0) {
      issues.push({
        type: 'suggestion',
        message: 'data-feeds.cjs: Some cache TTLs may be too short, causing excessive API calls',
      });
    }
  }

  // Check proxy.cjs
  const proxy = readFile(path.join(__dirname, '..', 'server', 'proxy.cjs'));
  if (proxy) {
    // Check for CORS configuration
    if (proxy.includes("cors()") && !proxy.includes('origin:')) {
      issues.push({
        type: 'warning',
        message: 'proxy.cjs: CORS allows all origins - restrict in production',
      });
    }

    // Check for security headers
    if (!proxy.includes('helmet') && !proxy.includes('X-Content-Type-Options')) {
      issues.push({
        type: 'suggestion',
        message: 'proxy.cjs: Missing security headers (consider using helmet.js)',
      });
    }
  }

  return issues;
}

function analyzeSettings() {
  const issues = [];

  const settings = readFile(path.join(SRC_DIR, 'stores', 'settings.ts'));
  if (settings) {
    // Check for validation
    if (!settings.includes('validate') && !settings.includes('isValid')) {
      issues.push({
        type: 'suggestion',
        message: 'settings.ts: No validation for settings - invalid data could cause issues',
      });
    }

    // Check for migration handling
    if (!settings.includes('version') && !settings.includes('migrate')) {
      issues.push({
        type: 'suggestion',
        message: 'settings.ts: No versioning/migration - old settings may break on updates',
      });
    }

    // Check localStorage error handling
    if (!settings.includes('catch')) {
      issues.push({
        type: 'warning',
        message: 'settings.ts: localStorage operations may fail in private browsing',
      });
    }
  }

  return issues;
}

function runAnalysis() {
  log('\n' + '='.repeat(60), 'blue');
  log('Blake News Now - Frontend Diagnostic', 'blue');
  log('='.repeat(60), 'blue');

  // Analyze all TSX files
  log('\n[1/4] Analyzing React Components...', 'cyan');
  const tsxFiles = getFiles(SRC_DIR, '.tsx');

  for (const file of tsxFiles) {
    const content = readFile(file);
    if (!content) continue;

    const componentIssues = analyzeComponent(file, content);
    const hookIssues = analyzeHooks(file, content);
    const styleIssues = analyzeStyles(file, content);

    for (const issue of [...componentIssues, ...hookIssues, ...styleIssues]) {
      results[issue.type === 'error' ? 'errors' : issue.type === 'warning' ? 'warnings' : 'suggestions'].push(issue.message);
    }
  }

  // Analyze TS files (hooks, stores)
  log('\n[2/4] Analyzing TypeScript Files...', 'cyan');
  const tsFiles = getFiles(SRC_DIR, '.ts');

  for (const file of tsFiles) {
    const content = readFile(file);
    if (!content) continue;

    const issues = analyzeComponent(file, content);
    for (const issue of issues) {
      results[issue.type === 'error' ? 'errors' : issue.type === 'warning' ? 'warnings' : 'suggestions'].push(issue.message);
    }
  }

  // Analyze server code
  log('\n[3/4] Analyzing Server Code...', 'cyan');
  const serverIssues = analyzeServerCode();
  for (const issue of serverIssues) {
    results[issue.type === 'error' ? 'errors' : issue.type === 'warning' ? 'warnings' : 'suggestions'].push(issue.message);
  }

  // Analyze settings
  log('\n[4/4] Analyzing Settings Store...', 'cyan');
  const settingsIssues = analyzeSettings();
  for (const issue of settingsIssues) {
    results[issue.type === 'error' ? 'errors' : issue.type === 'warning' ? 'warnings' : 'suggestions'].push(issue.message);
  }

  // Print results
  printResults();
}

function printResults() {
  log('\n' + '='.repeat(60), 'blue');
  log('Analysis Results', 'blue');
  log('='.repeat(60), 'blue');

  log(`\nFound: ${results.errors.length} errors, ${results.warnings.length} warnings, ${results.suggestions.length} suggestions`);

  if (results.errors.length > 0) {
    log('\n--- Errors (Must Fix) ---', 'red');
    for (const error of results.errors) {
      log(`  ✗ ${error}`, 'red');
    }
  }

  if (results.warnings.length > 0) {
    log('\n--- Warnings (Should Fix) ---', 'yellow');
    for (const warning of results.warnings) {
      log(`  ⚠ ${warning}`, 'yellow');
    }
  }

  if (results.suggestions.length > 0) {
    log('\n--- Suggestions (Nice to Have) ---', 'cyan');
    for (const suggestion of results.suggestions) {
      log(`  → ${suggestion}`, 'dim');
    }
  }

  // Architecture recommendations
  log('\n--- Architecture Recommendations ---', 'blue');
  const archRecommendations = [
    'Consider adding React Query or SWR for data fetching with automatic caching/revalidation',
    'Add a proper state management solution (Zustand, Jotai) as the app grows',
    'Implement proper error boundaries around data-fetching components',
    'Add loading skeletons to all data components for better UX',
    'Consider code splitting with React.lazy() for larger components',
    'Add service worker for offline support and faster loading',
    'Implement proper logging infrastructure (not just console.log)',
    'Add unit tests for hooks and utility functions',
    'Add E2E tests with Playwright or Cypress',
    'Consider adding Storybook for component documentation',
  ];

  for (const rec of archRecommendations) {
    log(`  • ${rec}`, 'dim');
  }

  log('\n' + '='.repeat(60), 'blue');
}

// Run
runAnalysis();
