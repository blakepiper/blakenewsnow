import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SETTINGS, updatePaneSize } from '../src/stores/settings.ts';

test('saved-article state is no longer part of settings', () => {
  assert.equal('readingList' in DEFAULT_SETTINGS, false);
});

test('includes the requested financial publishers as enabled news sources', () => {
  const sources = new Map(DEFAULT_SETTINGS.sources.map(source => [source.id, source]));

  for (const id of ['bloomberg', 'financial-times', 'wall-street-journal']) {
    assert.equal(sources.get(id)?.enabled, true);
    assert.equal(sources.get(id)?.category, 'news');
  }
});

test('pane dimensions persist within usable bounds', () => {
  const wide = updatePaneSize(DEFAULT_SETTINGS, 'sidebarWidth', 900);
  const short = updatePaneSize(DEFAULT_SETTINGS, 'weatherHeight', 20);
  const tall = updatePaneSize(DEFAULT_SETTINGS, 'marketsHeight', 900);

  assert.equal(wide.paneSizes.sidebarWidth, 560);
  assert.equal(short.paneSizes.weatherHeight, 100);
  assert.equal(tall.paneSizes.marketsHeight, 520);
  assert.equal(DEFAULT_SETTINGS.paneSizes.sidebarWidth, 380);
});
