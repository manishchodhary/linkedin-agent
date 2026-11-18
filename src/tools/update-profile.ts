import { FunctionTool } from '@google/adk';

import { profileUpdateSchema } from '../data/profile.schema.js';
import { updateProfile } from '../data/profile-store.js';

export const updateProfileTool = new FunctionTool({
  name: 'update_profile',
  description:
    "Updates the user's local professional profile. Only change fields the user explicitly provides or clearly asks to change. This tool does not modify LinkedIn.",
  parameters: profileUpdateSchema,
  execute: async (patch) => {
    const updatedProfile = await updateProfile(patch);

    return {
      status: 'success',
      message: 'The local profile was updated and saved.',
      data: updatedProfile,
    };
  },
});
