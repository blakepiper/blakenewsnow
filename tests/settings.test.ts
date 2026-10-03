import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SETTINGS, setAllSources, updatePaneSize } from '../src/stores/settings.ts';
import { getSourceCategory } from '../src/utils/formatters.ts';

test('saved-article state is no longer part of settings', () => {
  assert.equal('readingList' in DEFAULT_SETTINGS, false);
});

test('includes the requested financial publishers as enabled finance sources', () => {
  const sources = new Map(DEFAULT_SETTINGS.sources.map(source => [source.id, source]));

  for (const id of ['bloomberg', 'financial-times', 'wall-street-journal']) {
    assert.equal(sources.get(id)?.enabled, true);
    assert.equal(sources.get(id)?.category, 'finance');
  }
});

test('includes credential-free federated and open social sources', () => {
  const sources = new Map(DEFAULT_SETTINGS.sources.map(source => [source.id, source]));

  for (const id of [
    'lemmy-politics',
    'lemmy-science',
    'mastodon-trending',
  ]) {
    assert.equal(sources.get(id)?.enabled, true);
    assert.equal(sources.get(id)?.category, 'social');
  }
});

test('includes 4chan /g/ as an optional technology source with its API alias', () => {
  const source = DEFAULT_SETTINGS.sources.find(source => source.id === '4chan-g');
  assert.equal(source?.enabled, false);
  assert.equal(source?.category, 'tech');
  assert.deepEqual(source?.apiSources, ['/g/']);
  assert.equal(getSourceCategory('/g/'), 'tech');
  assert.equal(getSourceCategory('4chan /g/'), 'tech');
  assert.equal(getSourceCategory('/his/'), 'social');
});

test('includes science news outlets and journals as enabled science sources', () => {
  const sources = new Map(DEFAULT_SETTINGS.sources.map(source => [source.id, source]));

  for (const id of [
    'science-daily',
    'phys-org',
    'science-news',
    'live-science',
    'quanta-magazine',
    'nasa',
    'aaas-science-news',
    'nature',
    'science-journal',
    'pnas',
    'cell',
    'science-advances',
    'elife',
    'plos-one',
    'the-lancet',
    'nejm',
    'aps-psychology',
    'neuroscience-news-psychology',
    'frontiers-psychology',
    'human-factors',
    'ergonomics',
  ]) {
    const source = sources.get(id);
    assert.equal(source?.enabled, true);
    assert.equal(source?.category, 'science');
    assert.equal(getSourceCategory(source?.name || ''), 'science');
  }
});

test('includes free local, primary, regional, verification, and technical sources', () => {
  const sources = new Map(DEFAULT_SETTINGS.sources.map(source => [source.id, source]));
  for (const id of [
    'gdelt',
    'the-hindu',
    'white-house',
    'cisa',
    'sec',
    'factcheck',
    'krebs',
    'ieee-spectrum',
    'openai-news',
    'wtop',
    'wamu',
    'alexandria-city',
    'alexandria-times',
    'alxnow',
  ]) {
    assert.equal(sources.get(id)?.enabled, true);
  }
  assert.equal(sources.get('wtop')?.category, 'local');
  assert.equal(sources.get('alexandria-city')?.category, 'local');
  assert.equal(getSourceCategory('WTOP'), 'local');
});

test('selects and unselects every source in one immutable update', () => {
  const unselected = setAllSources(DEFAULT_SETTINGS, false);
  const selected = setAllSources(unselected, true);

  assert.ok(unselected.sources.every(source => !source.enabled));
  assert.ok(selected.sources.every(source => source.enabled));
  assert.ok(DEFAULT_SETTINGS.sources.some(source => !source.enabled));
  assert.equal(setAllSources(selected, true), selected);
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

test('enables all monitored scientists in Science', () => {
  for (const name of ['Karl Friston', 'Michael Levin', 'Chris Fields', 'Geoffrey Hinton', 'Yann LeCun', 'Percy Liang', 'Stuart Russell', 'Yoshua Bengio', 'Fei-Fei Li', 'Yejin Choi', 'Dawn Song', 'Chris Olah', 'Neel Nanda', 'Paul Christiano', 'Dan Hendrycks', 'Myles Allen', 'Piers Forster', 'Gavin Schmidt', 'Friederike Otto', 'Richard Alley', 'Corinne Le Quéré', 'Marshall Burke', 'Jesse Jenkins', 'Michael Mann', 'Zeke Hausfather', 'Matt Kaeberlein', 'Valter Longo', 'David Sinclair', 'Steve Horvath', 'Michael Snyder', 'Herman Pontzer', 'Vishwa Deep Dixit', 'Rhonda Patrick', 'Peter Attia', 'Chris Masterjohn', 'Lisa Kaltenegger', 'Nikku Madhusudhan', 'Sara Seager', 'David Kipping', 'Victoria Meadows', 'Ravi Kopparapu', 'Jessie Christiansen', 'Kevin Hand', 'Sara Imari Walker', 'Jason Wright', 'Jennifer Doudna', 'Feng Zhang', 'David Liu', 'George Church', 'Jay Keasling', 'James Collins', 'Pamela Silver', 'Drew Endy', 'Timothy Lu', 'Cameron Myhrvold']) {
    const source = DEFAULT_SETTINGS.sources.find(source => source.name === name);
    assert.equal(source?.enabled, true);
    assert.equal(source?.category, 'science');
    assert.equal(getSourceCategory(name), 'science');
  }
});
