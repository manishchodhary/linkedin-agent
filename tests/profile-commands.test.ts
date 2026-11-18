import assert from 'node:assert/strict';
import test from 'node:test';

import { parseProfileCommand } from '../src/agents/profile-commands.js';

test('parses local skill additions and removals', () => {
  assert.deepEqual(
    parseProfileCommand('Add Python to my local saved technical skills.'),
    { type: 'add-skill', value: 'Python' },
  );
  assert.deepEqual(
    parseProfileCommand('Remove Python from my saved skills.'),
    { type: 'remove-skill', value: 'Python' },
  );
});

test('parses About and professional title updates', () => {
  assert.deepEqual(
    parseProfileCommand('Update my local About section to Backend developer.'),
    { type: 'set-about', value: 'Backend developer' },
  );
  assert.deepEqual(
    parseProfileCommand('Change my saved professional title to Backend Engineer.'),
    { type: 'set-title', value: 'Backend Engineer' },
  );
});

test('parses target role additions and removals', () => {
  assert.deepEqual(
    parseProfileCommand('Add target role "Platform Engineer" to my saved roles.'),
    { type: 'add-role', value: 'Platform Engineer' },
  );
  assert.deepEqual(
    parseProfileCommand('Remove target role "DevOps" from my saved roles.'),
    { type: 'remove-role', value: 'DevOps' },
  );
});

test('parses profile display and link updates', () => {
  assert.deepEqual(
    parseProfileCommand('Show my complete saved profile.'),
    { type: 'show' },
  );
  assert.deepEqual(
    parseProfileCommand('Update my saved GitHub link to https://github.com/example.'),
    { type: 'set-link', field: 'github', value: 'https://github.com/example' },
  );
});

test('does not intercept LinkedIn account changes or vague requests', () => {
  assert.equal(
    parseProfileCommand('Change my LinkedIn profile headline.'),
    null,
  );
  assert.equal(parseProfileCommand('Add Python to my skills.'), null);
});
