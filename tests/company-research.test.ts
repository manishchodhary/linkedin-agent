import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

test('company research reports save, list, retrieve, and validate', async () => {
  const temporaryDataDir = await mkdtemp(resolve(tmpdir(), 'linkedin-agent-research-'));
  process.env.LINKEDIN_AGENT_DATA_DIR = temporaryDataDir;

  try {
    const { saveCompanyResearch, listCompanyResearch, getCompanyResearch } = await import('../src/data/company-research-store.js');
    const saved = await saveCompanyResearch({
      companyName: 'Example Training Ltd',
      website: 'https://example.com',
      opportunityTitle: 'Backend Intern',
      summary: 'Posting advertises an internship and mentions a paid training requirement.',
      evidence: [{ sourceUrl: 'https://example.com/internship', note: 'Advert says fee is required before internship placement.' }],
      riskFlags: ['course_or_training_fee', 'pay_to_get_internship'],
      verdict: 'high_risk_avoid',
      recommendation: 'Avoid paying and do not proceed unless the fee requirement is disproven.',
      confidence: 'medium',
    });

    assert.equal(saved.companyName, 'Example Training Ltd');
    assert.equal((await listCompanyResearch()).length, 1);
    assert.equal((await getCompanyResearch(saved.id))?.verdict, 'high_risk_avoid');
    assert.equal(await getCompanyResearch('00000000-0000-4000-8000-000000000000'), null);
  } finally {
    await rm(temporaryDataDir, { recursive: true, force: true });
    delete process.env.LINKEDIN_AGENT_DATA_DIR;
  }
});
