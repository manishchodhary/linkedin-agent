import { FunctionTool } from '@google/adk';
import { z } from 'zod';

import { getDraft, listDrafts, markDraftReviewed, saveDraft } from '../data/draft-store.js';

export const saveContentDraftTool = new FunctionTool({
  name: 'save_content_draft',
  description: 'Saves a LinkedIn post draft to local persistent storage. Only call when the user explicitly asks to save or keep the draft. Saving does not publish it.',
  parameters: z.object({
    title: z.string().optional().describe('Short internal title for this draft.'),
    content: z.string().min(1).describe('The complete draft text.'),
  }),
  execute: async ({ title, content }) => ({
    status: 'success',
    message: 'Draft saved locally. It is not published.',
    draft: await saveDraft({ title, content }),
  }),
});

export const listContentDraftsTool = new FunctionTool({
  name: 'list_content_drafts',
  description: 'Lists saved LinkedIn drafts and their IDs, titles, statuses, and dates.',
  parameters: z.object({}),
  execute: async () => ({ status: 'success', drafts: await listDrafts() }),
});

export const getContentDraftTool = new FunctionTool({
  name: 'get_content_draft',
  description: 'Retrieves the full text of one saved LinkedIn draft by its ID.',
  parameters: z.object({ id: z.string().uuid() }),
  execute: async ({ id }) => {
    const draft = await getDraft(id);
    return draft
      ? { status: 'success', draft }
      : { status: 'not_found', message: 'No saved draft exists with that ID.' };
  },
});

export const markContentDraftReviewedTool = new FunctionTool({
  name: 'mark_content_draft_reviewed',
  description: 'Marks a saved LinkedIn draft as reviewed. This does not publish it.',
  parameters: z.object({ id: z.string().uuid() }),
  execute: async ({ id }) => {
    const draft = await markDraftReviewed(id);
    return draft
      ? { status: 'success', message: 'Draft marked as reviewed; it remains unpublished.', draft }
      : { status: 'not_found', message: 'No saved draft exists with that ID.' };
  },
});
