import { saveCompanyResearch } from '../data/company-research-store.js';

type SearchResult = { title: string; url: string; snippet: string };

const searchQueries = (company: string) => [
  `${company} official company`,
  `${company} internship program software developer`,
  `${company} internship fees training course registration certificate`,
  `${company} reviews complaints internship`,
  `${company} products services engineering team`,
];

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

export function extractResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const resultAnchors = [...html.matchAll(/<a(?=[^>]*class="[^"]*result__a")[^>]*>([\\s\\S]*?)<\\/a>/g)];
  const snippetAnchors = [...html.matchAll(/<a(?=[^>]*class="[^"]*result__snippet")[^>]*>([\\s\\S]*?)<\\/a>|<div(?=[^>]*class="[^"]*result__snippet")[^>]*>([\\s\\S]*?)<\\/div>/g)];
  for (let i = 0; i < resultAnchors.length; i++) {
    const match = resultAnchors[i];
    const href = match[0].match(/href="([^"]+)"/)?.[1];
    if (!href) continue;
    let url = decodeHtml(href);
    try {
      const parsed = new URL(url);
      const redirect = parsed.searchParams.get('uddg');
      if (redirect) url = redirect;
    } catch { continue; }
    if (!url.startsWith('http')) continue;
    const title = decodeHtml(match[1].replace(/<[^>]+>/g, '').trim());
    const snippet = decodeHtml((snippetAnchors[i]?.[1] ?? snippetAnchors[i]?.[2] ?? '').replace(/<[^>]+>/g, '').trim());
    results.push({ title, url, snippet });
  }
  return results;
}

async function search(query: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkedInAgentCompanyResearch/1.0)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Search request failed (${response.status})`);
  return extractResults(await response.text());
}

async function main() {
  const company = process.argv.slice(2).join(' ').trim();
  if (!company) {
    console.error('Usage: npm run research -- "Company Name"');
    process.exitCode = 1;
    return;
  }

  console.log(`Company research: ${company}\nSearch provider: DuckDuckGo HTML results (direct HTTP; no Gemini call)\n`);
  const unique = new Map<string, SearchResult>();
  for (const query of searchQueries(company)) {
    console.log(`Searching: ${query}`);
    try {
      const results = await search(query);
      for (const result of results) if (!unique.has(result.url)) unique.set(result.url, result);
      console.log(`  ${results.length} results\n`);
    } catch (error) {
      console.error(`  Search failed: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  const results = [...unique.values()];
  if (!results.length) {
    console.log('No search results were retrieved. Treat research as insufficient evidence; no verdict made.');
    return;
  }

  console.log('RESULTS (search snippets are leads, not verified facts):\n');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.title}\n   ${result.url}\n   ${result.snippet || '(No snippet returned)'}\n`);
  });

  const report = await saveCompanyResearch({
    companyName: company,
    summary: `Standalone search gathered ${results.length} result(s) across company profile, internship, fees, reviews, and product/business queries. These are search snippets and must be independently opened and checked before making a final verdict.`,
    evidence: results.map((result) => ({ sourceUrl: result.url, note: `Search result: ${result.title}. Snippet: ${result.snippet || 'No snippet.'}` })),
    riskFlags: ['unverified_claims'],
    verdict: 'insufficient_evidence',
    recommendation: 'Review and open the listed sources. Search snippets alone are not sufficient to establish legitimacy, fee requirements, or accusations.',
    confidence: 'low',
  });
  console.log(`\nSaved raw search-lead report locally. Report ID: ${report.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
