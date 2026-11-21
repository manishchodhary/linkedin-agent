import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export const opportunityStatusSchema = z.enum([
  'saved',
  'matched',
  'researching',
  'contacted',
  'applied',
  'interview',
  'rejected',
  'offer',
]);

export const opportunitySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  company: z.string().min(1),
  url: z.string().url().optional(),
  location: z.string().optional(),
  status: opportunityStatusSchema.default('saved'),
  notes: z.string().default(''),
  foundAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  followUpAt: z.string().datetime().optional(),
});

export const contactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  company: z.string().optional(),
  role: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  notes: z.string().default(''),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  followUpAt: z.string().datetime().optional(),
});

export type Opportunity = z.infer<typeof opportunitySchema>;
export type OpportunityStatus = z.infer<typeof opportunityStatusSchema>;
export type Contact = z.infer<typeof contactSchema>;

const dataDir = process.env.LINKEDIN_AGENT_DATA_DIR ?? resolve(process.cwd(), 'data');
const opportunitiesPath = resolve(dataDir, 'opportunities.json');
const contactsPath = resolve(dataDir, 'contacts.json');

async function readArray<T>(path: string, schema: z.ZodType<T>): Promise<T[]> {
  try {
    return z.array(schema).parse(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeArray<T>(path: string, items: T[]): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const tempPath = `${path}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(items, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(tempPath, path);
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  return parsed.toString().replace(/\/$/, '');
}

export async function addOpportunity(input: {
  title: string;
  company: string;
  url?: string;
  location?: string;
  notes?: string;
  status?: OpportunityStatus;
}): Promise<{ opportunity: Opportunity; duplicate: boolean }> {
  const title = input.title.trim();
  const company = input.company.trim();
  if (!title || !company) throw new Error('Title and company are required.');
  const opportunities = await readArray(opportunitiesPath, opportunitySchema);
  if (input.url) {
    const normalized = normalizeUrl(input.url);
    const existing = opportunities.find((item) => item.url && normalizeUrl(item.url) === normalized);
    if (existing) return { opportunity: existing, duplicate: true };
  }
  const now = new Date().toISOString();
  const opportunity = opportunitySchema.parse({
    id: randomUUID(),
    title,
    company,
    url: input.url?.trim(),
    location: input.location?.trim() || undefined,
    status: input.status ?? 'saved',
    notes: input.notes?.trim() ?? '',
    foundAt: now,
    updatedAt: now,
  });
  opportunities.push(opportunity);
  await writeArray(opportunitiesPath, opportunities);
  return { opportunity, duplicate: false };
}

export async function listOpportunities(): Promise<Opportunity[]> {
  return (await readArray(opportunitiesPath, opportunitySchema)).sort((a, b) => b.foundAt.localeCompare(a.foundAt));
}

export async function updateOpportunity(id: string, updates: {
  status?: OpportunityStatus;
  notes?: string;
  followUpAt?: string | null;
}): Promise<Opportunity | null> {
  const opportunities = await readArray(opportunitiesPath, opportunitySchema);
  const index = opportunities.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const updated = opportunitySchema.parse({
    ...opportunities[index],
    ...updates,
    followUpAt: updates.followUpAt === null ? undefined : updates.followUpAt ?? opportunities[index].followUpAt,
    updatedAt: new Date().toISOString(),
  });
  opportunities[index] = updated;
  await writeArray(opportunitiesPath, opportunities);
  return updated;
}

export async function addContact(input: {
  name: string;
  company?: string;
  role?: string;
  linkedinUrl?: string;
  notes?: string;
}): Promise<{ contact: Contact; duplicate: boolean }> {
  const name = input.name.trim();
  if (!name) throw new Error('Contact name is required.');
  const contacts = await readArray(contactsPath, contactSchema);
  const existing = contacts.find((item) =>
    (input.linkedinUrl && item.linkedinUrl && normalizeUrl(item.linkedinUrl) === normalizeUrl(input.linkedinUrl)) ||
    (!input.linkedinUrl && item.name.toLowerCase() === name.toLowerCase() && (item.company ?? '').toLowerCase() === (input.company ?? '').trim().toLowerCase()),
  );
  if (existing) return { contact: existing, duplicate: true };
  const now = new Date().toISOString();
  const contact = contactSchema.parse({
    id: randomUUID(),
    name,
    company: input.company?.trim() || undefined,
    role: input.role?.trim() || undefined,
    linkedinUrl: input.linkedinUrl?.trim(),
    notes: input.notes?.trim() ?? '',
    createdAt: now,
    updatedAt: now,
  });
  contacts.push(contact);
  await writeArray(contactsPath, contacts);
  return { contact, duplicate: false };
}

export async function listContacts(): Promise<Contact[]> {
  return (await readArray(contactsPath, contactSchema)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateContact(id: string, updates: {
  notes?: string;
  followUpAt?: string | null;
}): Promise<Contact | null> {
  const contacts = await readArray(contactsPath, contactSchema);
  const index = contacts.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const updated = contactSchema.parse({
    ...contacts[index],
    notes: updates.notes ?? contacts[index].notes,
    followUpAt: updates.followUpAt === null ? undefined : updates.followUpAt ?? contacts[index].followUpAt,
    updatedAt: new Date().toISOString(),
  });
  contacts[index] = updated;
  await writeArray(contactsPath, contacts);
  return updated;
}
