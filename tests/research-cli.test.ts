import assert from 'node:assert/strict';
import test from 'node:test';

import { parseSerperResults, researchQueryPlan } from '../src/research/cli.js';

test('parseSerperResults extracts organic Google results from Serper payload', () => {
  const results = parseSerperResults({
    organic: [
      { title: 'Internship program', link: 'https://example.com/intern', snippet: 'Fee information in the listing', date: 'Nov 2026' },
      { title: 'Company About', link: 'https://example.org/about' },
      { title: 'Malformed row', link: 'not-a-url' },
      null,
    ],
  });
  assert.equal(results.length, 2);
  assert.equal(results[0].title, 'Internship program');
  assert.equal(results[0].url, 'https://example.com/intern');
  assert.equal(results[0].snippet, 'Fee information in the listing');
  assert.equal(results[0].date, 'Nov 2026');
  assert.equal(results[1].snippet, '');
});

test('parseSerperResults handles missing organic results', () => {
  assert.deepEqual(parseSerperResults({}), []);
  assert.deepEqual(parseSerperResults(null), []);
});

test('smart research uses one query while deep research uses three', () => {
  assert.equal(researchQueryPlan('Acme').length, 1);
  assert.equal(researchQueryPlan('Acme', true).length, 3);
  assert.match(researchQueryPlan('Acme')[0], /Acme/);
});
