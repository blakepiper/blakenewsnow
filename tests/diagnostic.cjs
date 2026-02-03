#!/usr/bin/env node
/**
 * Blake News Now - Diagnostic Test Suite
 *
 * Run with: node tests/diagnostic.cjs
 *
 * Tests all API endpoints, validates data structure, measures performance,
 * and identifies potential issues.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const API_BASE = 'http://localhost:3001';
const TIMEOUT = 15000;

// Colors for terminal output
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
  passed: 0,
  failed: 0,
  warnings: 0,
  issues: [],
  improvements: [],
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(test) {
  results.passed++;
  log(`  ✓ ${test}`, 'green');
}

function fail(test, reason) {
  results.failed++;
  results.issues.push({ test, reason });
  log(`  ✗ ${test}: ${reason}`, 'red');
}

function warn(test, reason) {
  results.warnings++;
  results.improvements.push({ test, reason });
  log(`  ⚠ ${test}: ${reason}`, 'yellow');
}

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const req = protocol.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      timeout: options.timeout || TIMEOUT,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          status: res.statusCode,
          data,
          duration,
          headers: res.headers,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function testEndpoint(name, path, validators = []) {
  log(`\n${colors.cyan}Testing ${name}${colors.reset}`);

  try {
    const res = await fetch(`${API_BASE}${path}`);

    // Check HTTP status
    if (res.status !== 200) {
      fail(`${name} HTTP status`, `Expected 200, got ${res.status}`);
      return null;
    }
    pass(`${name} returns 200`);

    // Check response time
    if (res.duration > 5000) {
      warn(`${name} response time`, `Slow response: ${res.duration}ms (>5s)`);
    } else if (res.duration > 2000) {
      warn(`${name} response time`, `Moderate response: ${res.duration}ms (>2s)`);
    } else {
      pass(`${name} response time: ${res.duration}ms`);
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(res.data);
      pass(`${name} returns valid JSON`);
    } catch (e) {
      fail(`${name} JSON parsing`, e.message);
      return null;
    }

    // Run custom validators
    for (const validator of validators) {
      validator(data, name);
    }

    return data;
  } catch (e) {
    fail(`${name} request`, e.message);
    return null;
  }
}

// Validators
function validateArray(minLength = 1) {
  return (data, name) => {
    if (!Array.isArray(data)) {
      fail(`${name} is array`, `Expected array, got ${typeof data}`);
    } else if (data.length < minLength) {
      warn(`${name} data count`, `Only ${data.length} items (expected >=${minLength})`);
    } else {
      pass(`${name} has ${data.length} items`);
    }
  };
}

function validateFields(requiredFields) {
  return (data, name) => {
    const items = Array.isArray(data) ? data.slice(0, 3) : [data];
    const missing = new Set();

    for (const item of items) {
      for (const field of requiredFields) {
        if (item[field] === undefined || item[field] === null) {
          missing.add(field);
        }
      }
    }

    if (missing.size > 0) {
      fail(`${name} required fields`, `Missing: ${[...missing].join(', ')}`);
    } else {
      pass(`${name} has all required fields`);
    }
  };
}

function validateTimestamps() {
  return (data, name) => {
    const items = Array.isArray(data) ? data : [data];
    let invalidCount = 0;
    let futureCount = 0;
    let staleCount = 0;
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    for (const item of items) {
      if (item.timestamp) {
        const ts = new Date(item.timestamp).getTime();
        if (isNaN(ts)) {
          invalidCount++;
        } else if (ts > now + 60000) { // 1 min tolerance
          futureCount++;
        } else if (ts < oneWeekAgo) {
          staleCount++;
        }
      }
    }

    if (invalidCount > 0) {
      fail(`${name} timestamps`, `${invalidCount} invalid timestamps`);
    } else {
      pass(`${name} timestamps are valid`);
    }

    if (futureCount > 0) {
      warn(`${name} future timestamps`, `${futureCount} items have future timestamps`);
    }

    if (staleCount > items.length * 0.5) {
      warn(`${name} stale content`, `${staleCount}/${items.length} items are >1 week old`);
    }
  };
}

function validateUrls() {
  return (data, name) => {
    const items = Array.isArray(data) ? data : [data];
    let missingUrls = 0;
    let invalidUrls = 0;

    for (const item of items) {
      const url = item.link || item.url || item.permalink;
      if (!url) {
        missingUrls++;
      } else {
        try {
          new URL(url);
        } catch {
          invalidUrls++;
        }
      }
    }

    if (invalidUrls > 0) {
      fail(`${name} URLs`, `${invalidUrls} invalid URLs`);
    } else if (missingUrls > items.length * 0.3) {
      warn(`${name} missing URLs`, `${missingUrls}/${items.length} items have no URL`);
    } else {
      pass(`${name} URLs are valid`);
    }
  };
}

function validateNoDuplicates(field) {
  return (data, name) => {
    if (!Array.isArray(data)) return;

    const seen = new Map();
    let duplicates = 0;

    for (const item of data) {
      const key = item[field];
      if (key) {
        if (seen.has(key)) {
          duplicates++;
        }
        seen.set(key, (seen.get(key) || 0) + 1);
      }
    }

    if (duplicates > 0) {
      warn(`${name} duplicates`, `${duplicates} duplicate ${field}s found`);
    } else {
      pass(`${name} has no duplicate ${field}s`);
    }
  };
}

function validateSourceDiversity() {
  return (data, name) => {
    if (!Array.isArray(data)) return;

    const sources = new Map();
    for (const item of data) {
      const source = item.source;
      if (source) {
        sources.set(source, (sources.get(source) || 0) + 1);
      }
    }

    if (sources.size < 3) {
      warn(`${name} source diversity`, `Only ${sources.size} unique sources`);
    } else {
      pass(`${name} has ${sources.size} unique sources`);
    }

    // Check for source dominance
    const total = data.length;
    for (const [source, count] of sources) {
      if (count > total * 0.5) {
        warn(`${name} source balance`, `${source} dominates with ${count}/${total} items (${Math.round(count/total*100)}%)`);
      }
    }
  };
}

// Main test suite
async function runTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('Blake News Now - Diagnostic Test Suite', 'blue');
  log('='.repeat(60), 'blue');

  // Test server health
  log('\n[1/8] Server Health', 'cyan');
  await testEndpoint('Health check', '/health', [
    (data) => {
      if (data.status !== 'ok') {
        fail('Health status', `Expected "ok", got "${data.status}"`);
      } else {
        pass('Health status is ok');
      }
    }
  ]);

  // Test Headlines
  log('\n[2/8] Headlines API', 'cyan');
  await testEndpoint('Headlines', '/api/headlines', [
    validateArray(5),
    validateFields(['id', 'title', 'source', 'timestamp']),
    validateTimestamps(),
    validateUrls(),
    validateNoDuplicates('title'),
    validateSourceDiversity(),
  ]);

  // Test Reddit
  log('\n[3/8] Reddit API', 'cyan');
  const redditData = await testEndpoint('Reddit', '/api/reddit', [
    validateArray(5),
    validateFields(['id', 'title', 'source', 'score', 'comments', 'timestamp']),
    validateTimestamps(),
    (data, name) => {
      if (!Array.isArray(data)) return;
      const lowScore = data.filter(d => d.score < 100).length;
      if (lowScore > data.length * 0.5) {
        warn(`${name} engagement`, `${lowScore}/${data.length} posts have <100 upvotes`);
      }
    }
  ]);

  // Test Hacker News
  log('\n[4/8] Hacker News API', 'cyan');
  await testEndpoint('Hacker News', '/api/hackernews', [
    validateArray(10),
    validateFields(['id', 'title', 'source', 'score', 'comments', 'timestamp']),
    validateTimestamps(),
    (data, name) => {
      if (!Array.isArray(data)) return;
      const withUrls = data.filter(d => d.url).length;
      if (withUrls < data.length * 0.7) {
        warn(`${name} external links`, `Only ${withUrls}/${data.length} have external URLs (some are Ask HN/Show HN)`);
      }
    }
  ]);

  // Test Tech News
  log('\n[5/8] Tech News API', 'cyan');
  await testEndpoint('Tech News', '/api/tech', [
    validateArray(5),
    validateFields(['id', 'title', 'source', 'timestamp']),
    validateTimestamps(),
    validateSourceDiversity(),
  ]);

  // Test Markets
  log('\n[6/8] Markets API', 'cyan');
  await testEndpoint('Markets', '/api/markets', [
    (data, name) => {
      if (!data.indices || !Array.isArray(data.indices)) {
        fail(`${name} indices`, 'Missing indices array');
      } else if (data.indices.length < 3) {
        warn(`${name} indices count`, `Only ${data.indices.length} indices`);
      } else {
        pass(`${name} has ${data.indices.length} indices`);
      }

      if (!data.movers || !Array.isArray(data.movers)) {
        fail(`${name} movers`, 'Missing movers array');
      } else {
        pass(`${name} has ${data.movers.length} movers`);
      }
    },
    (data, name) => {
      // Check for valid prices
      const allItems = [...(data.indices || []), ...(data.movers || [])];
      const invalidPrices = allItems.filter(i => !i.price || i.price <= 0).length;
      if (invalidPrices > 0) {
        fail(`${name} prices`, `${invalidPrices} items have invalid prices`);
      } else {
        pass(`${name} all prices are valid`);
      }
    }
  ]);

  // Test Weather
  log('\n[7/8] Weather API', 'cyan');
  await testEndpoint('Weather', '/api/weather?zip=22314', [
    validateFields(['temperature', 'condition', 'location', 'lat', 'lon', 'forecast']),
    (data, name) => {
      if (data.temperature < -50 || data.temperature > 150) {
        fail(`${name} temperature`, `Unreasonable temperature: ${data.temperature}°F`);
      } else {
        pass(`${name} temperature is reasonable: ${data.temperature}°F`);
      }
    },
    (data, name) => {
      if (!data.forecast || !Array.isArray(data.forecast)) {
        fail(`${name} forecast`, 'Missing forecast array');
      } else if (data.forecast.length < 3) {
        warn(`${name} forecast`, `Only ${data.forecast.length} day forecast`);
      } else {
        pass(`${name} has ${data.forecast.length} day forecast`);
      }
    }
  ]);

  // Test Predictions
  log('\n[8/8] Predictions API', 'cyan');
  await testEndpoint('Predictions', '/api/predictions', [
    validateArray(3),
    validateFields(['id', 'question', 'yesPrice', 'category']),
    (data, name) => {
      if (!Array.isArray(data)) return;
      const invalidOdds = data.filter(d => d.yesPrice < 0 || d.yesPrice > 100).length;
      if (invalidOdds > 0) {
        fail(`${name} odds range`, `${invalidOdds} items have odds outside 0-100%`);
      } else {
        pass(`${name} all odds are in valid range`);
      }
    },
    (data, name) => {
      if (!Array.isArray(data)) return;
      // Check for sports content that should be filtered
      const sportsKeywords = ['nba', 'nfl', 'mlb', 'nhl', 'game', 'match', ' vs '];
      const sportsItems = data.filter(d => {
        const q = (d.question || '').toLowerCase();
        return sportsKeywords.some(kw => q.includes(kw));
      });
      if (sportsItems.length > 0) {
        warn(`${name} content filter`, `${sportsItems.length} potential sports items not filtered`);
      }
    }
  ]);

  // Print summary
  printSummary();
}

function printSummary() {
  log('\n' + '='.repeat(60), 'blue');
  log('Test Summary', 'blue');
  log('='.repeat(60), 'blue');

  log(`\nResults: ${results.passed} passed, ${results.failed} failed, ${results.warnings} warnings`);

  if (results.issues.length > 0) {
    log('\n--- Critical Issues ---', 'red');
    for (const issue of results.issues) {
      log(`  • ${issue.test}: ${issue.reason}`, 'red');
    }
  }

  if (results.improvements.length > 0) {
    log('\n--- Suggested Improvements ---', 'yellow');
    for (const improvement of results.improvements) {
      log(`  • ${improvement.test}: ${improvement.reason}`, 'yellow');
    }
  }

  // Additional recommendations based on test results
  log('\n--- General Recommendations ---', 'cyan');

  const recommendations = [
    'Add request caching headers (ETag, Last-Modified) for better client caching',
    'Implement request rate limiting to prevent API abuse',
    'Add error tracking/logging service integration (Sentry, etc.)',
    'Consider adding API response compression (gzip)',
    'Add input validation for query parameters (zip code format, etc.)',
    'Implement circuit breaker pattern for external API calls',
    'Add health check endpoints for each data source individually',
    'Consider WebSocket for real-time updates instead of polling',
    'Add API versioning (e.g., /api/v1/headlines)',
    'Implement request timeout configuration per endpoint',
  ];

  for (const rec of recommendations) {
    log(`  → ${rec}`, 'dim');
  }

  log('\n' + '='.repeat(60), 'blue');

  // Exit code based on failures
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  log(`\nFatal error: ${err.message}`, 'red');
  process.exit(1);
});
