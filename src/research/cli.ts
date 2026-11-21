import 'dotenv/config';

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { listCompanyResearch, saveCompanyResearch } from '../data/company-research-store.js';

type SearchResult = { title: string; url: string; snippet: string; date?: string };
type Usage = { totalQueries: number; successfulQueries: number; failedQueries: number; history: Array<{ query: string; at: string; success: boolean }> };

const dataDir = process.env.LINKEDIN_AGENT_DATA_DIR ?? resolve(process.cwd(), 'data');
const usagePath = resolve(dataDir, 'research-usage.json');
const CACHE_DAYS = Number(process.env.COMPANY_RESEARCH_CACHE_DAYS ?? 30);

const smartQuery = (company: string) => `${company} company official website software internship jobs reviews`;
const deepQueries = (company: string) => [
  `${company} internship fees registration training complaints`,
  `${company} products services engineering team`,
];

export function parseSerperResults(payload: unknown): SearchResult[] {
  if (!payload || typeof payload !== 'object') return [];
  const organic = (payload as { organic?: unknown }).organic;
  if (!Array.isArray(organic)) return [];
  return organic.flatMap((item): SearchResult[] => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    if (typeof row.title !== 'string' || typeof row.link !== 'string' || !row.link.startsWith('http')) return [];
    return [{
      title: row.title,
      url: row.link,
      snippet: typeof row.snippet === 'string' ? row.snippet : '',
      date: typeof row.date === 'string' ? row.date : undefined,
    }];
  });
}

async function readUsage(): Promise<Usage> {
  try {
    return JSON.parse(await readFile(usagePath, 'utf8')) as Usage;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { totalQueries: 0, successfulQueries: 0, failedQueries: 0, history: [] };
    throw error;
  }
}

async function recordUsage(query: string, success: boolean): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const usage = await readUsage();
  usage.totalQueries++;
  success ? usage.successfulQueries++ : usage.failedQueries++;
  usage.history.push({ query, at: new Date().toISOString(), success });
  await writeFile(usagePath, `${JSON.stringify(usage, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

async function search(query: string, apiKey: string): Promise<SearchResult[]> {
  let success = false;
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 10, gl: 'in', hl: 'en' }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(`Serper API request failed (${response.status}): ${message.slice(0, 300)}`);
    }
    const results = parseSerperResults(await response.json());
    success = true;
    return results;
  } finally {
    await recordUsage(query, success);
  }
}

function isFresh(date: string): boolean {
  const age = Date.now() - new Date(date).getTime();
  return Number.isFinite(age) && age >= 0 && age <= CACHE_DAYS * 86400000;
}

async function showUsage(): Promise<void> {
  const usage = await readUsage();
  console.log(`Serper usage tracker\nTotal query attempts: ${usage.totalQueries}\nSuccessful: ${usage.successfulQueries}\nFailed: ${usage.failedQueries}\n`);
  console.log(`Cache TTL: ${CACHE_DAYS} days\n`);
  const recent = usage.history.slice(-10).reverse();
  if (recent.length) {
    console.log('Recent queries:');
    for (const item of recent) console.log(`- [${item.success ? 'ok' : 'failed'}] ${item.at} | ${item.query}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--usage')) {
    await showUsage();
    return;
  }
  const deep = args.includes('--deep');
  const force = args.includes('--force');
  const company = args.filter((arg) => !arg.startsWith('--')).join(' ').trim();
  if (!company) {
    console.error('Usage: npm run research -- "Company Name" [--deep] [--force]\n       npm run research -- --usage');
    process.exitCode = 1;
    return;
  }

  console.log(`Company research: ${company}\nMode: ${deep ? 'Deep (up to 3 queries)' : 'Smart (1 query)'}\nCache: ${CACHE_DAYS} days\n`);
  if (!force) {
    const existing = await listCompanyResearch();
    const cached = existing.find((report) => report.companyName.trim().toLowerCase() === company.toLowerCase() && isFresh(report.researchedAt));
    if (cached) {
      console.log(`Using cached research from ${cached.researchedAt}. Search queries used: 0\n`);
      console.log(`Summary: ${cached.summary}\nVerdict: ${cached.verdict}\nConfidence: ${cached.confidence}\nRecommendation: ${cached.recommendation}\n`);
      cached.evidence.forEach((item, index) => console.log(`${index + 1}. ${item.sourceUrl ?? '(no URL)'}\n   ${item.note}\n`));
      console.log(`Report ID: ${cached.id}`);
      return;
    }
  }

  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) {
    console.error('SERPER_API_KEY is missing. Add it to your local .env. See README research setup.');
    process.exitCode = 1;
    return;
  }

  const queries = [smartQuery(company), ...(deep ? deepQueries(company) : [])];
  const unique = new Map<string, SearchResult>();
  let failedQueries = 0;
  for (const query of queries) {
    console.log(`Searching: ${query}`);
    try {
      const results = await search(query, apiKey);
      for (const result of results) if (!unique.has(result.url)) unique.set(result.url, result);
      console.log(`  ${results.length} results\n`);
    } catch (error) {
      failedQueries++;
      console.error(`  Search failed: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  const results = [...unique.values()];
  if (!results.length) {
    console.log(`No search results retrieved (${failedQueries}/${queries.length} query failures). No verdict made.`);
    return;
  }

  console.log('RESULTS (search snippets are leads, not verified facts):\n');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.title}\n   ${result.url}\n   ${result.snippet || '(No snippet returned)'}${result.date ? `\n   Date: ${result.date}` : ''}\n`);
  });

  const report = await saveCompanyResearch({
    companyName: company,
    summary: `Serper collected ${results.length} search result(s) using ${queries.length - failedQueries} successful query request(s). Snippets are leads and have not been verified by opening source pages.`,
    evidence: results.map((result) => ({ sourceUrl: result.url, note: `Search result: ${result.title}. Snippet: ${result.snippet || 'No snippet.'}${result.date ? ` Date: ${result.date}.` : ''}` })),
    riskFlags: ['unverified_claims'],
    verdict: 'insufficient_evidence',
    recommendation: 'Open and verify sources before conclusions. Search snippets alone cannot confirm legitimacy or fee requirements.',
    confidence: 'low',
  });
  console.log(`\nSaved search-lead report locally. Report ID: ${report.id}`);
  console.log(`Queries attempted this run: ${queries.length}; failed: ${failedQueries}`);
  console.log('Run npm run research -- --usage to view query usage.');
}

if (process.argv[1]?.endsWith('/src/research/cli.ts')) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
