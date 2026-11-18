import { FunctionTool } from '@google/adk';
import { z } from 'zod';

import { profile } from '../data/profile.js';

const profileContextParameters = z.object({
  section: z
    .enum(['all', 'headline', 'about', 'skills', 'targetRoles', 'links'])
    .describe('The profile section to retrieve. Use all for the complete profile.'),
});

export const getProfileContextTool = new FunctionTool({
  name: 'get_profile_context',
  description:
    'Retrieves the user's saved professional profile context, including their headline, about summary, skills, target roles, and public links. Use this before drafting personalized LinkedIn content or career messages. This tool is read-only.',
  parameters: profileContextParameters,
  execute: async ({ section }) => {
    const data =
      section === 'all'
        ? profile
        : section === 'headline'
          ? { professionalTitle: profile.professionalTitle }
          : { [section]: profile[section] };

    return {
      status: 'success',
      section,
      data,
    };
  },
});
