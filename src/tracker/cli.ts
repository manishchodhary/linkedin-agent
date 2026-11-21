import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  addContact,
  addOpportunity,
  listContacts,
  listOpportunities,
  updateOpportunity,
  updateContact,
  opportunityStatusSchema,
} from '../data/tracker-store.js';

const args = process.argv.slice(2);
const command = args[0];

function printHelp(): void {
  console.log(`Tracker commands:
  add-job       Add an opportunity interactively
  list          List saved opportunities
  update <id>   Update an opportunity status/notes/follow-up
  add-contact   Add a contact interactively
  contacts      List saved contacts
  follow-ups    Show due and overdue follow-ups
  help          Show this help`);
}

async function promptFields(fields: Array<[string, boolean]>): Promise<Record<string, string>> {
  const rl = createInterface({ input: stdin, output: stdout });
  const result: Record<string, string> = {};
  try {
    for (const [key, required] of fields) {
      while (true) {
        const value = (await rl.question(`${key}${required ? ' (required)' : ''}: `)).trim();
        if (required && !value) {
          console.log(`${key} is required. Please try again.`);
          continue;
        }
        if (value && (key === 'Job URL' || key === 'LinkedIn URL')) {
          let valid = false;
          try {
            const parsed = new URL(value);
            valid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
          } catch {
            valid = false;
          }
          if (!valid) {
            console.log('Please enter a valid URL beginning with http:// or https://, or leave blank.');
            continue;
          }
        }
        result[key] = value;
        break;
      }
    }
  } finally {
    rl.close();
  }
  return result;
}

function printOpportunities(items: Awaited<ReturnType<typeof listOpportunities>>): void {
  if (!items.length) {
    console.log('No opportunities saved yet.');
    return;
  }
  for (const item of items) {
    console.log(`[${item.status}] ${item.title} — ${item.company}`);
    console.log(`  ID: ${item.id}`);
    if (item.location) console.log(`  Location: ${item.location}`);
    if (item.url) console.log(`  URL: ${item.url}`);
    if (item.followUpAt) console.log(`  Follow-up: ${item.followUpAt}`);
    if (item.notes) console.log(`  Notes: ${item.notes}`);
  }
}

async function main(): Promise<void> {
  switch (command) {
    case 'add-job': {
      const fields = await promptFields([
        ['Job title', true],
        ['Company', true],
        ['Job URL', false],
        ['Location', false],
        ['Notes', false],
      ]);
      const result = await addOpportunity({
        title: fields['Job title'],
        company: fields.Company,
        url: fields['Job URL'] || undefined,
        location: fields.Location || undefined,
        notes: fields.Notes || undefined,
      });
      console.log(result.duplicate ? 'Duplicate job detected; existing record kept.' : 'Opportunity saved.');
      console.log(`ID: ${result.opportunity.id}`);
      break;
    }
    case 'list': {
      printOpportunities(await listOpportunities());
      break;
    }
    case 'update': {
      const id = args[1];
      if (!id) throw new Error('Usage: npm run tracker -- update <opportunity-id>');
      const current = (await listOpportunities()).find((item) => item.id === id);
      if (!current) throw new Error('Opportunity ID not found.');
      const fields = await promptFields([
        ['Status (' + opportunityStatusSchema.options.join('|') + ')', false],
        ['Notes (leave blank to keep current)', false],
        ['Follow-up date/time ISO (blank=keep, "none"=clear)', false],
      ]);
      const statusText = fields['Status (' + opportunityStatusSchema.options.join('|') + ')'];
      const status = statusText ? opportunityStatusSchema.parse(statusText) : undefined;
      const followupText = fields['Follow-up date/time ISO (blank=keep, "none"=clear)'];
      let followUpAt: string | null | undefined;
      if (followupText === 'none') followUpAt = null;
      else if (followupText) {
        const date = new Date(followupText);
        if (Number.isNaN(date.getTime())) throw new Error('Invalid follow-up date. Use ISO format.');
        followUpAt = date.toISOString();
      }
      const updated = await updateOpportunity(id, {
        status,
        notes: fields['Notes (leave blank to keep current)'] || undefined,
        followUpAt,
      });
      console.log(updated ? 'Opportunity updated.' : 'Opportunity not found.');
      break;
    }
    case 'add-contact': {
      const fields = await promptFields([
        ['Contact name', true],
        ['Company', false],
        ['Role', false],
        ['LinkedIn URL', false],
        ['Notes', false],
      ]);
      const result = await addContact({
        name: fields['Contact name'],
        company: fields.Company || undefined,
        role: fields.Role || undefined,
        linkedinUrl: fields['LinkedIn URL'] || undefined,
        notes: fields.Notes || undefined,
      });
      console.log(result.duplicate ? 'Duplicate contact detected; existing record kept.' : 'Contact saved.');
      console.log(`ID: ${result.contact.id}`);
      break;
    }
    case 'contacts': {
      const items = await listContacts();
      if (!items.length) console.log('No contacts saved yet.');
      for (const item of items) {
        console.log(`${item.name}${item.role ? ' — ' + item.role : ''}${item.company ? ' @ ' + item.company : ''}`);
        console.log(`  ID: ${item.id}`);
        if (item.linkedinUrl) console.log(`  LinkedIn: ${item.linkedinUrl}`);
        if (item.followUpAt) console.log(`  Follow-up: ${item.followUpAt}`);
        if (item.notes) console.log(`  Notes: ${item.notes}`);
      }
      break;
    }
    case 'follow-ups': {
      const now = Date.now();
      const jobs = (await listOpportunities()).filter((item) => item.followUpAt && Date.parse(item.followUpAt) <= now);
      const contacts = (await listContacts()).filter((item) => item.followUpAt && Date.parse(item.followUpAt) <= now);
      if (!jobs.length && !contacts.length) console.log('No follow-ups due.');
      for (const item of jobs) console.log(`JOB: ${item.title} @ ${item.company} — due ${item.followUpAt} [${item.id}]`);
      for (const item of contacts) console.log(`CONTACT: ${item.name}${item.company ? ' @ ' + item.company : ''} — due ${item.followUpAt} [${item.id}]`);
      break;
    }
    default:
      printHelp();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
