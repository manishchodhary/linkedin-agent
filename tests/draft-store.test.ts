import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

test('draft storage saves, lists, retrieves, and marks drafts reviewed', async () => {
  const temporaryDataDir = await mkdtemp(resolve(tmpdir(), 'linkedin-agent-drafts-'));
  process.env.LINKEDIN_AGENT_DATA_DIR = temporaryDataDir;

  try {
    const { saveDraft, listDrafts, getDraft, markDraftReviewed } = await import('../src/data/draft-store.js');
    const saved = await saveDraft({
      title: 'Test draft',
      content: 'A test LinkedIn post.',
    });

    assert.equal(saved.status, 'draft');
    assert.equal(saved.title, 'Test draft');
    assert.equal((await getDraft(saved.id))?.content, 'A test LinkedIn post.');
    assert.equal((await listDrafts()).length, 1);

    const reviewed = await markDraftReviewed(saved.id);
    assert.equal(reviewed?.status, 'reviewed');
    assert.equal((await getDraft(saved.id))?.status, 'reviewed');
    assert.equal(await getDraft('00000000-0000-4000-8000-000000000000'), null);
  } finally {
    await rm(temporaryDataDir, { recursive: true, force: true });
    delete process.env.LINKEDIN_AGENT_DATA_DIR;
  }
});
