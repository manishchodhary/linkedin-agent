import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import { getProfile } from '../data/profile-store.js';
import { matchOpportunity } from './profile-match.js';

async function main() {
  const filePath = process.argv[2];
  if (!filePath || filePath === '--help' || filePath === '-h') {
    console.log('Usage: npm run match -- ./opportunity.txt');
    console.log('Reads a job or internship description from a local text file and compares it with data/profile.json.');
    return;
  }
  try {
    const opportunityText = await readFile(filePath, 'utf8');
    if (!opportunityText.trim()) {
      console.error('Opportunity file is empty.');
      process.exitCode = 1;
      return;
    }
    const profile = await getProfile();
    const report = matchOpportunity(profile, opportunityText);
    console.log('Opportunity profile match (local analysis; no API calls)\n');
    console.log(`Match score: ${report.score}/100`);
    console.log(`Recommendation: ${report.recommendation.toUpperCase()}\n`);
    console.log(`Matched skills (${report.matchedSkills.length}): ${report.matchedSkills.length ? report.matchedSkills.join(', ') : 'None detected'}`);
    console.log(`Missing skills (${report.missingSkills.length}): ${report.missingSkills.length ? report.missingSkills.join(', ') : 'None detected'}`);
    console.log(`Role alignment: ${report.roleAlignment.length ? report.roleAlignment.join(', ') : 'No direct alignment detected'}`);
    console.log(`Detected roles: ${report.detectedRoles.length ? report.detectedRoles.join(', ') : 'None'}\n`);
    console.log('Reasons:');
    report.reasons.forEach((reason) => console.log(`- ${reason}`));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Could not read opportunity file: ${filePath}`);
      console.error('Create a text file with the job description and try again.');
    } else {
      console.error(error instanceof Error ? error.message : String(error));
    }
    process.exitCode = 1;
  }
}
if (process.argv[1]?.endsWith('/src/matching/cli.ts')) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
