import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export const contentDraftSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  platform: z.enum(['linkedin']).default('linkedin'),
  content: z.string().min(1),
  status: z.enum(['draft', 'reviewed']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ContentDraft = z.infer<typeof contentDraftSchema>;

const dataDir = process.env.LINKEDIN_AGENT_DATA_DIR ?? resolve(process.cwd(), 'data');
const draftsPath = resolve(dataDir, 'drafts.json');

async function readDrafts(): Promise<ContentDraft[]> {
  try {
    const file = await readFile(draftsPath, 'utf8');
    return z.array(contentDraftSchema).parse(JSON.parse(file));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeDrafts(drafts: ContentDraft[]): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const tempPath = `${draftsPath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(drafts, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await rename(tempPath, draftsPath);
}

export async function saveDraft(input: { title?: string; content: string; platform?: 'linkedin' }): Promise<ContentDraft> {
  const now = new Date().toISOString();
  const draft = contentDraftSchema.parse({
    id: randomUUID(),
    title: input.title?.trim() || undefined,
    platform: input.platform ?? 'linkedin',
    content: input.content.trim(),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  });
  const drafts = await readDrafts();
  drafts.push(draft);
  await writeDrafts(drafts);
  return draft;
}

export async function listDrafts(): Promise<ContentDraft[]> {
  return (await readDrafts()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDraft(id: string): Promise<ContentDraft | null> {
  const drafts = await readDrafts();
  return drafts.find((draft) => draft.id === id) ?? null;
}

export async function markDraftReviewed(id: string): Promise<ContentDraft | null> {
  const drafts = await readDrafts();
  const index = drafts.findIndex((draft) => draft.id === id);
  if (index < 0) return null;

  const updated = contentDraftSchema.parse({
    ...drafts[index],
    status: 'reviewed',
    updatedAt: new Date().toISOString(),
  });
  drafts[index] = updated;
  await writeDrafts(drafts);
  return updated;
}
