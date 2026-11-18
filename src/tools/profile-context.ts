import { FunctionTool } from '@google/adk';
import { z } from 'zod';

import { getProfile } from '../data/profile-store.js';

const profileContextParameters = z.object({
  section: z
    .enum(['all', 'headline', 'about', 'skills', 'targetRoles', 'links'])
    .describe('The profile section to retrieve. Use all for the complete profile.'),
});

export const getProfileContextTool = new FunctionTool({
  name: 'get_profile_context',
  description:
    "Retrieves the user's current saved professional profile from local persistent storage. Use this before drafting personalized LinkedIn content or career messages. This tool is read-only.",
  parameters: profileContextParameters,
  execute: async ({ section }) => {
    const profile = await getProfile();

    switch (section) {
      case 'all':
        return { status: 'success', section, data: profile };
      case 'headline':
        return {
          status: 'success',
          section,
          data: { professionalTitle: profile.professionalTitle },
        };
      case 'about':
        return { status: 'success', section, data: { about: profile.about } };
      case 'skills':
        return { status: 'success', section, data: { skills: profile.skills } };
      case 'targetRoles':
        return {
          status: 'success',
          section,
          data: { targetRoles: profile.targetRoles },
        };
      case 'links':
        return { status: 'success', section, data: { links: profile.links } };
    }
  },
});
