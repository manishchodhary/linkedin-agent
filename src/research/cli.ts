import 'dotenv/config';
import 'dotenv/config';

import { saveCompanyResearch } from '../data/company-research-store.js';

type SearchResult = { title: string; url: string; snippet: string; date?: string };

const searchQueries = (company: string) => [
  `${company} official company`,
  `${company} internship program software developer`,
  `${company} internship fees training course registration certificate`,
  `${company} reviews complaints internship`,
  `${company} products services engineering team`,
];

export function parseSerperResults(payload: unknown): SearchResult[] {
  if (!payload || typeof payload !== 'object') return [];
  const organic = (payload as { organic?: unknown }).organic;
  if (!Array.isArray(organic)) return [];
  return organic.flatMap((item): SearchResult[] => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    if (typeof row.title !== 'string' || typeof row.link !== 'string') return [];
    if (!row.link.startsWith('http')) return [];
    return [{
      title: row.title,
      url: row.link,
      snippet: typeof row.snippet === 'string' ? row.snippet : '',
      date: typeof row.date === 'string' ? row.date : undefined,
    }];
  });
}

async function search(query: string, apiKey: string): Promise<SearchResult[]> {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: 10, gl: 'in', hl: 'en' }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`Serper API request failed (${response.status}): ${message.slice(0, 300)}`);
  }
  return parseSerperResults(await response.json());
}

async function main() {
  const company = process.argv.slice(2).join(' ').trim();
  if (!company) {
    console.error('Usage: npm run research -- "Company Name"');
    process.exitCode = 1;
    return;
  }
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) {
    console.error('SERPER_API_KEY is missing. Create a Serper.dev account, copy your API key, and add SERPER_API_KEY=... to your local .env file. See README research setup.');
    process.exitCode = 1;
    return;
  }

  console.log(`Company research: ${company}\nSearch provider: Serper Google Search API (no Gemini call)\n`);
  const unique = new Map<string, SearchResult>();
  let failedQueries = 0;
  for (const query of searchQueries(company)) {
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
    console.log(`No search results retrieved (${failedQueries}/${searchQueries(company).length} query failures). No verdict made.`);
    return;
  }

  console.log('RESULTS (search snippets are leads, not verified facts):\n');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.title}\n   ${result.url}\n   ${result.snippet || '(No snippet returned)'}${result.date ? `\n   Date: ${result.date}` : ''}\n`);
  });

  const report = await saveCompanyResearch({
    companyName: company,
    summary: `Standalone Serper web search collected ${results.length} result(s) across company profile, internship, fees, reviews, and products/engineering queries. Search snippets are leads and have not been verified by opening source pages.`,
    evidence: results.map((result) => ({ sourceUrl: result.url, note: `Search result: ${result.title}. Snippet: ${result.snippet || 'No snippet.'}${result.date ? ` Date: ${result.date}.` : ''}` })),
    riskFlags: ['unverified_claims'],
    verdict: 'insufficient_evidence',
    recommendation: 'Open and verify each source before reaching a conclusion. Search snippets alone are insufficient to confirm legitimacy, fee requirements, or accusations.',
    confidence: 'low',
  });
  console.log(`\nSaved search-lead report locally. Report ID: ${report.id}`);
}

if (process.argv[1]?.endsWith('/src/research/cli.ts')) {\nmain().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
