const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');
const { Readability } = require('@mozilla/readability');
const { JSDOM, VirtualConsole } = require('jsdom');

const MAX_REDIRECTS = 4;
const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_ARTICLE_CHARACTERS = 100000;
const REQUEST_TIMEOUT_MS = 12000;
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const BROWSER_USER_AGENT = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  'AppleWebKit/537.36 (KHTML, like Gecko)',
  'Chrome/138.0.0.0 Safari/537.36',
].join(' ');

const previewCache = new Map();

class PreviewError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

function isPrivateIpv4(address) {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet))) return true;
  const [a, b] = octets;

  return a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224;
}

function isPublicAddress(address) {
  address = address.replace(/^\[|\]$/g, '');
  const family = net.isIP(address);
  if (family === 4) return !isPrivateIpv4(address);
  if (family !== 6) return false;

  const normalized = address.toLowerCase();
  if (normalized === '::' || normalized === '::1') return false;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return false;
  if (/^fe[89ab]/.test(normalized)) return false;
  if (normalized.startsWith('::ffff:')) {
    const mappedAddress = normalized.slice('::ffff:'.length);
    const hexadecimal = mappedAddress.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hexadecimal) {
      const high = parseInt(hexadecimal[1], 16);
      const low = parseInt(hexadecimal[2], 16);
      return isPublicAddress(
        `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`
      );
    }
    return isPublicAddress(mappedAddress);
  }
  return true;
}

function parsePreviewUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new PreviewError('The article URL is invalid.', 400);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new PreviewError('Only HTTP and HTTPS articles can be previewed.', 400);
  }
  if (url.username || url.password) {
    throw new PreviewError('Article URLs cannot contain credentials.', 400);
  }
  if (url.port && !['80', '443'].includes(url.port)) {
    throw new PreviewError('Article URLs cannot use a custom port.', 400);
  }
  return url;
}

async function resolvePublicHost(url) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(hostname)) {
    if (!isPublicAddress(hostname)) {
      throw new PreviewError('Private network addresses cannot be previewed.', 403);
    }
    return [{ address: hostname, family: net.isIP(hostname) }];
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new PreviewError('The article host could not be resolved.', 502);
  }

  if (addresses.length === 0 || addresses.some(result => !isPublicAddress(result.address))) {
    throw new PreviewError('Private network addresses cannot be previewed.', 403);
  }
  return addresses;
}

function fetchHtml(urlValue, redirectCount = 0) {
  return Promise.resolve().then(async () => {
    if (redirectCount > MAX_REDIRECTS) {
      throw new PreviewError('The article redirected too many times.');
    }

    const url = parsePreviewUrl(urlValue);
    const addresses = await resolvePublicHost(url);
    const transport = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const request = transport.request({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        servername: url.hostname,
        lookup: (_hostname, options, callback) => {
          if (typeof options === 'object' && options.all) {
            callback(null, addresses);
            return;
          }
          const requestedFamily = typeof options === 'object' ? options.family : 0;
          const result = addresses.find(address => !requestedFamily || address.family === requestedFamily)
            || addresses[0];
          callback(null, result.address, result.family);
        },
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'identity',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1',
          'User-Agent': BROWSER_USER_AGENT,
        },
        timeout: REQUEST_TIMEOUT_MS,
      }, response => {
        const status = response.statusCode || 0;

        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          const redirectUrl = new URL(response.headers.location, url).toString();
          fetchHtml(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
          return;
        }

        if (status < 200 || status >= 300) {
          response.resume();
          reject(new PreviewError(`The publisher returned HTTP ${status}.`, status === 404 ? 404 : 502));
          return;
        }

        const contentType = String(response.headers['content-type'] || '').toLowerCase();
        if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
          response.resume();
          reject(new PreviewError('This source is not an HTML article.', 415));
          return;
        }

        const chunks = [];
        let byteLength = 0;
        response.on('data', chunk => {
          byteLength += chunk.length;
          if (byteLength > MAX_HTML_BYTES) {
            request.destroy(new PreviewError('The article is too large to preview.', 413));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => {
          resolve({
            html: Buffer.concat(chunks).toString('utf8'),
            finalUrl: url.toString(),
          });
        });
      });

      request.on('timeout', () => {
        request.destroy(new PreviewError('The publisher took too long to respond.', 504));
      });
      request.on('error', reject);
      request.end();
    });
  });
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}

function extractArticle(html, url) {
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { url, virtualConsole });
  try {
    const article = new Readability(dom.window.document, {
      charThreshold: 120,
      maxElemsToParse: 0,
    }).parse();

    if (!article || cleanText(article.textContent).length < 120) {
      const document = dom.window.document;
      const title = cleanText(
        document.querySelector('meta[property="og:title"]')?.getAttribute('content')
        || document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
        || document.title
      );
      const description = cleanText(
        document.querySelector('meta[property="og:description"]')?.getAttribute('content')
        || document.querySelector('meta[name="twitter:description"]')?.getAttribute('content')
        || document.querySelector('meta[name="description"]')?.getAttribute('content')
      );

      if (description.length >= 60) {
        return {
          title,
          byline: '',
          siteName: cleanText(
            document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')
          ),
          excerpt: description,
          publishedTime: cleanText(
            document.querySelector('meta[property="article:published_time"]')?.getAttribute('content')
          ),
          length: description.length,
          paragraphs: [description],
          extractionMode: 'metadata',
        };
      }

      throw new PreviewError('A readable article could not be extracted from this page.', 422);
    }

    const contentDom = new JSDOM(article.content, { virtualConsole });
    let blocks;
    try {
      const blockElements = contentDom.window.document.querySelectorAll(
        'p, h2, h3, blockquote, pre, li'
      );
      blocks = [...blockElements]
        .map(element => cleanText(element.textContent))
        .filter((text, index, all) =>
          text.length > 0 && all.findIndex(candidate => candidate === text) === index
        );
    } finally {
      contentDom.window.close();
    }
    const fallbackBlocks = cleanText(article.textContent)
      .split(/\n{2,}/)
      .map(cleanText)
      .filter(Boolean);

    let characterCount = 0;
    const paragraphs = (blocks.length > 0 ? blocks : fallbackBlocks)
      .filter(block => {
        characterCount += block.length;
        return characterCount <= MAX_ARTICLE_CHARACTERS;
      })
      .slice(0, 300);

    return {
      title: cleanText(article.title),
      byline: cleanText(article.byline),
      siteName: cleanText(article.siteName),
      excerpt: cleanText(article.excerpt),
      publishedTime: cleanText(article.publishedTime),
      length: article.length,
      paragraphs,
      extractionMode: 'article',
    };
  } finally {
    dom.window.close();
  }
}

function articleUrlCandidates(requestedUrl) {
  const url = parsePreviewUrl(requestedUrl);
  const candidates = [url.toString()];

  if (/(^|\.)thehill\.com$/i.test(url.hostname) && !url.pathname.endsWith('/amp/')) {
    const ampUrl = new URL(url);
    ampUrl.pathname = `${ampUrl.pathname.replace(/\/$/, '')}/amp/`;
    candidates.push(ampUrl.toString());
  }

  return candidates;
}

async function getArticlePreview(urlValue) {
  const requestedUrl = parsePreviewUrl(urlValue).toString();
  const cached = previewCache.get(requestedUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  let article;
  let finalUrl;
  let lastError;
  for (const candidate of articleUrlCandidates(requestedUrl)) {
    try {
      const fetched = await fetchHtml(candidate);
      article = extractArticle(fetched.html, fetched.finalUrl);
      finalUrl = fetched.finalUrl;
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!article || !finalUrl) throw lastError;

  const data = {
    ...article,
    requestedUrl,
    finalUrl,
    cached: false,
  };

  if (previewCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = previewCache.keys().next().value;
    if (oldestKey) previewCache.delete(oldestKey);
  }
  previewCache.set(requestedUrl, { data, timestamp: Date.now() });
  return data;
}

function registerArticlePreviewRoute(app) {
  app.get('/api/article-preview', async (req, res) => {
    const url = typeof req.query.url === 'string' ? req.query.url : '';
    if (!url) return res.status(400).json({ error: 'Missing article URL.' });

    try {
      const preview = await getArticlePreview(url);
      res.set('Cache-Control', 'private, max-age=300');
      return res.json(preview);
    } catch (error) {
      const status = error instanceof PreviewError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'Unable to preview this article.';
      if (status >= 500) console.error('[ARTICLE PREVIEW]', message);
      return res.status(status).json({ error: message });
    }
  });
}

module.exports = {
  PreviewError,
  extractArticle,
  getArticlePreview,
  isPublicAddress,
  parsePreviewUrl,
  articleUrlCandidates,
  registerArticlePreviewRoute,
};
