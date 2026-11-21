import assert from 'node:assert/strict';
import test from 'node:test';

import { extractResults } from '../src/research/cli.js';

test('extractResults parses search titles, redirect URLs, and snippets', () => {
  const html = `
    <a class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fjob&amp;rut=x">Backend Internship &amp; Hiring</a>
    <a class="result__snippet" href="https://example.com/job">Training fees are <b>required</b> for this program.</a>
    <a class="result__a" href="https://example.org/about">Company About</a>
    <a class="result__snippet" href="https://example.org/about">Builds software products and services.</a>
  `;
  const results = extractResults(html);
  assert.equal(results.length, 2);
  assert.equal(results[0].url, 'https://example.com/job');
  assert.equal(results[0].title, 'Backend Internship & Hiring');
  assert.match(results[0].snippet, /Training fees are required/);
  assert.equal(results[1].url, 'https://example.org/about');
});
