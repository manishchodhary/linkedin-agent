import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('tracker stores opportunities and contacts, prevents duplicates, and updates follow-ups', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'linkedin-agent-tracker-'));
  process.env.LINKEDIN_AGENT_DATA_DIR = dir;
  const store = await import('../src/data/tracker-store.js');

  try {
    const first = await store.addOpportunity({
      title: 'Backend Intern',
      company: 'Example Labs',
      url: 'https://jobs.example.com/backend?ref=linkedin',
      location: 'Remote',
    });
    assert.equal(first.duplicate, false);
    assert.equal(first.opportunity.status, 'saved');

    const duplicate = await store.addOpportunity({
      title: 'Backend Intern',
      company: 'Example Labs',
      url: 'https://jobs.example.com/backend?ref=linkedin#apply',
    });
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.opportunity.id, first.opportunity.id);
    assert.equal((await store.listOpportunities()).length, 1);

    const followUpAt = new Date(Date.now() + 86400000).toISOString();
    const updated = await store.updateOpportunity(first.opportunity.id, {
      status: 'contacted',
      followUpAt,
      notes: 'Sent intro message',
    });
    assert.equal(updated?.status, 'contacted');
    assert.equal(updated?.followUpAt, followUpAt);
    assert.equal(updated?.notes, 'Sent intro message');

    const cleared = await store.updateOpportunity(first.opportunity.id, { followUpAt: null });
    assert.equal(cleared?.followUpAt, undefined);
    assert.equal(await store.updateOpportunity('missing-id', { status: 'applied' }), null);

    const contact = await store.addContact({
      name: 'A Recruiter',
      company: 'Example Labs',
      role: 'Talent Acquisition',
      linkedinUrl: 'https://www.linkedin.com/in/example-recruiter/',
    });
    assert.equal(contact.duplicate, false);

    const duplicateContact = await store.addContact({
      name: 'Another Name',
      linkedinUrl: 'https://www.linkedin.com/in/example-recruiter/#about',
    });
    assert.equal(duplicateContact.duplicate, true);
    assert.equal(duplicateContact.contact.id, contact.contact.id);

    const nameDuplicate = await store.addContact({ name: 'a recruiter', company: 'example labs' });
    assert.equal(nameDuplicate.duplicate, true);
    assert.equal((await store.listContacts()).length, 1);

    const contactFollowUp = await store.updateContact(contact.contact.id, { followUpAt });
    assert.equal(contactFollowUp?.followUpAt, followUpAt);
    assert.equal(await store.updateContact('missing-id', { notes: 'x' }), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
