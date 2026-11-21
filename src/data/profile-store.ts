import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { profileSchema, type Profile, type ProfileUpdate } from './profile.schema.js';

const projectRoot = process.cwd();
const profilePath = resolve(projectRoot, 'data/profile.json');
const defaultProfilePath = resolve(projectRoot, 'src/data/profile.default.json');

async function readDefaultProfile(): Promise<Profile> {
  const content = await readFile(defaultProfilePath, 'utf8');
  return profileSchema.parse(JSON.parse(content));
}

export async function getProfile(): Promise<Profile> {
  try {
    const content = await readFile(profilePath, 'utf8');
    return profileSchema.parse(JSON.parse(content));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    const defaults = await readDefaultProfile();
    await saveProfile(defaults);
    return defaults;
  }
}

async function saveProfile(profile: Profile): Promise<void> {
  await mkdir(resolve(projectRoot, 'data'), { recursive: true });

  const temporaryPath = `${profilePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(profile, null, 2)}\\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await rename(temporaryPath, profilePath);
}

export async function updateProfile(patch: ProfileUpdate): Promise<Profile> {
  const current = await getProfile();
  const updated = profileSchema.parse({
    ...current,
    ...patch,
    links: {
      ...current.links,
      ...patch.links,
    },
  });

  await saveProfile(updated);
  return updated;
}
