const assert = require('node:assert/strict');
const test = require('node:test');
const {
  articleUrlCandidates,
  extractArticle,
  isPublicAddress,
  parsePreviewUrl,
} = require('../server/article-preview.cjs');

test('blocks local, private, and metadata network addresses', () => {
  [
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
  ].forEach(address => assert.equal(isPublicAddress(address), false, address));

  assert.equal(isPublicAddress('1.1.1.1'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('accepts only ordinary HTTP and HTTPS article URLs', () => {
  assert.equal(parsePreviewUrl('https://example.com/story').hostname, 'example.com');
  assert.throws(() => parsePreviewUrl('file:///etc/passwd'));
  assert.throws(() => parsePreviewUrl('http://example.com:8080/story'));
  assert.throws(() => parsePreviewUrl('https://user:pass@example.com/story'));
});

test('extracts readable article text without navigation, scripts, or markup', () => {
  const body = Array.from({ length: 8 }, (_, index) =>
    `<p>Paragraph ${index + 1} explains an important development with enough detailed reporting to be useful to the reader.</p>`
  ).join('');
  const preview = extractArticle(`
    <!doctype html>
    <html>
      <head><title>Example report</title></head>
      <body>
        <nav>Subscribe Sign in Trending Topics</nav>
        <main>
          <article>
            <h1>Example report</h1>
            <p>By Ada Reporter</p>
            ${body}
            <script>window.badThing = true;</script>
          </article>
        </main>
      </body>
    </html>
  `, 'https://example.com/story');

  assert.match(preview.title, /Example report/);
  assert.ok(preview.paragraphs.length >= 4);
  assert.doesNotMatch(preview.paragraphs.join(' '), /Subscribe Sign in|window\.badThing/);
  assert.ok(preview.paragraphs.every(paragraph => !paragraph.includes('<')));
  assert.equal(preview.extractionMode, 'article');
});

test('falls back to safe page metadata when a full article is unavailable', () => {
  const preview = extractArticle(`
    <!doctype html>
    <html>
      <head>
        <title>Short social post</title>
        <meta property="og:site_name" content="Example Social">
        <meta property="og:description" content="A concise but useful source-provided description with enough context for a reader preview.">
      </head>
      <body><p>Too short.</p></body>
    </html>
  `, 'https://example.com/post');

  assert.equal(preview.extractionMode, 'metadata');
  assert.equal(preview.siteName, 'Example Social');
  assert.equal(preview.paragraphs.length, 1);
});

test('adds a publisher-supported AMP fallback for The Hill', () => {
  const candidates = articleUrlCandidates(
    'https://thehill.com/homenews/senate/12345/example-story/'
  );

  assert.equal(candidates.length, 2);
  assert.equal(
    candidates[1],
    'https://thehill.com/homenews/senate/12345/example-story/amp/'
  );
});
