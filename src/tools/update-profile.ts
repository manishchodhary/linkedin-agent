import { FunctionTool } from '@google/adk';

import { profileUpdateSchema } from '../data/profile.schema.js';
import { updateProfile } from '../data/profile-store.js';

export const updateProfileTool = new FunctionTool({
  name: 'update_profile',
  description:
    'WRITE TOOL: Saves changes to the local profile JSON file. This tool is available and must be called when the user asks to update their saved local profile. For a skills change, pass the complete skills array so existing skills are preserved. This does not modify LinkedIn.',
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
