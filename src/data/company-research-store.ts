import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export const riskFlagSchema = z.enum([
  'course_or_training_fee',
  'registration_fee',
  'certificate_fee',
  'pay_to_get_internship',
  'guaranteed_placement_claim',
  'pressure_or_urgency',
  'vague_role_or_tasks',
  'no_verifiable_company_presence',
  'no_real_product_or_service_evidence',
  'complaints_or_negative_reports',
  'unverified_claims',
]);

export const companyResearchSchema = z.object({
  id: z.string().uuid(),
  companyName: z.string().min(1),
  website: z.string().url().optional(),
  opportunityTitle: z.string().optional(),
  opportunityUrl: z.string().url().optional(),
  summary: z.string().min(1),
  evidence: z.array(z.object({
    sourceUrl: z.string().url().optional(),
    note: z.string().min(1),
  })).default([]),
  riskFlags: z.array(riskFlagSchema).default([]),
  verdict: z.enum(['worth_applying', 'needs_verification', 'high_risk_avoid', 'insufficient_evidence']),
  recommendation: z.string().min(1),
  confidence: z.enum(['low', 'medium', 'high']),
  researchedAt: z.string().datetime(),
});

export type CompanyResearch = z.infer<typeof companyResearchSchema>;

const dataDir = process.env.LINKEDIN_AGENT_DATA_DIR ?? resolve(process.cwd(), 'data');
const researchPath = resolve(dataDir, 'company-research.json');

async function readReports(): Promise<CompanyResearch[]> {
  try {
    return z.array(companyResearchSchema).parse(JSON.parse(await readFile(researchPath, 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeReports(reports: CompanyResearch[]): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const tempPath = `${researchPath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(reports, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(tempPath, researchPath);
}

export async function saveCompanyResearch(input: Omit<CompanyResearch, 'id' | 'researchedAt'>): Promise<CompanyResearch> {
  const report = companyResearchSchema.parse({ ...input, id: randomUUID(), researchedAt: new Date().toISOString() });
  const reports = await readReports();
  reports.push(report);
  await writeReports(reports);
  return report;
}

export async function listCompanyResearch(): Promise<CompanyResearch[]> {
  return (await readReports()).sort((a, b) => b.researchedAt.localeCompare(a.researchedAt));
}

export async function getCompanyResearch(id: string): Promise<CompanyResearch | null> {
  return (await readReports()).find((report) => report.id === id) ?? null;
}
