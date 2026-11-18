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
    "Retrieves the user's saved professional profile context, including their headline, about summary, skills, target roles, and public links. Use this before drafting personalized LinkedIn content or career messages. This tool is read-only.",
  parameters: profileContextParameters,
  execute: ({ section }) => {
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
