import { FunctionTool } from '@google/adk';
import { z } from 'zod';

import { getCompanyResearch, listCompanyResearch, saveCompanyResearch, riskFlagSchema } from '../data/company-research-store.js';

export const saveCompanyResearchTool = new FunctionTool({
  name: 'save_company_research',
  description: 'Save a company or internship verification report locally. Save only researched evidence and explicitly distinguish verified facts from unverified claims.',
  parameters: z.object({
    companyName: z.string().min(1),
    website: z.string().url().optional(),
    opportunityTitle: z.string().optional(),
    opportunityUrl: z.string().url().optional(),
    summary: z.string().min(1),
    evidence: z.array(z.object({ sourceUrl: z.string().url().optional(), note: z.string().min(1) })).default([]),
    riskFlags: z.array(riskFlagSchema).default([]),
    verdict: z.enum(['worth_applying', 'needs_verification', 'high_risk_avoid', 'insufficient_evidence']),
    recommendation: z.string().min(1),
    confidence: z.enum(['low', 'medium', 'high']),
  }),
  execute: async (input) => ({ status: 'success', message: 'Company research report saved locally.', report: await saveCompanyResearch(input) }),
});

export const listCompanyResearchTool = new FunctionTool({
  name: 'list_company_research',
  description: 'List saved company and internship research reports.',
  parameters: z.object({}),
  execute: async () => ({ status: 'success', reports: await listCompanyResearch() }),
});

export const getCompanyResearchTool = new FunctionTool({
  name: 'get_company_research',
  description: 'Retrieve a saved company verification report by its report ID.',
  parameters: z.object({ id: z.string().uuid() }),
  execute: async ({ id }) => {
    const report = await getCompanyResearch(id);
    return report ? { status: 'success', report } : { status: 'not_found', message: 'No report found for this ID.' };
  },
});
