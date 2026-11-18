import { BaseAgent, InvocationContext, LlmAgent } from '@google/adk';
import type { Event } from '@google/adk';

import { getProfile, updateProfile } from '../data/profile-store.js';
import { parseProfileCommand } from './profile-commands.js';

function formatProfile(profile: Awaited<ReturnType<typeof getProfile>>): string {
  return [
    `Name: ${profile.fullName}`,
    `Professional title: ${profile.professionalTitle}`,
    `About: ${profile.about}`,
    `Skills: ${profile.skills.join(', ')}`,
    `Target roles: ${profile.targetRoles.join(', ')}`,
    `GitHub: ${profile.links.github}`,
    `Portfolio: ${profile.links.portfolio}`,
    `LinkedIn: ${profile.links.linkedin}`,
  ].join('\n');
}

export class ProfileAwareAgent extends BaseAgent {
  private readonly assistant: LlmAgent;

  constructor(assistant: LlmAgent) {
    super({
      name: 'profile_aware_router',
      description:
        'Handles explicit local profile management commands deterministically and delegates other requests to Gemini.',
      subAgents: [assistant],
    });

    this.assistant = assistant;
  }

  async *runAsyncImpl(
    context: InvocationContext,
  ): AsyncGenerator<Event, void, undefined> {
    const message = (context.userContent?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('\n')
      .trim();

    // Accept one command per line, including pasted commands separated by escaped newlines.
    const commandLines = message
      .split(/\r?\n|\\+\s*/)
      .map((line) => line.trim())
      .filter(Boolean);
    const commands = commandLines.map(parseProfileCommand);

    if (commands.length > 0 && commands.every((command) => command !== null)) {
      const results: string[] = [];

      for (const command of commands) {
        if (!command) continue;

        let profile = await getProfile();

        switch (command.type) {
          case 'show':
            results.push(`Saved profile:\n${formatProfile(profile)}`);
            continue;

          case 'add-skill': {
            const exists = profile.skills.some(
              (item) => item.toLowerCase() === command.value.toLowerCase(),
            );
            if (!exists) {
              await updateProfile({ skills: [...profile.skills, command.value] });
            }
            results.push(
              exists
                ? `"${command.value}" is already in your saved skills.`
                : `Added "${command.value}" to your saved skills.`,
            );
            break;
          }

          case 'remove-skill': {
            const next = profile.skills.filter(
              (item) => item.toLowerCase() !== command.value.toLowerCase(),
            );
            if (next.length === profile.skills.length) {
              results.push(`"${command.value}" was not found in your saved skills. No changes made.`);
            } else {
              await updateProfile({ skills: next });
              results.push(`Removed "${command.value}" from your saved skills.`);
            }
            break;
          }

          case 'set-about':
            await updateProfile({ about: command.value });
            results.push('Updated your saved About summary.');
            break;

          case 'set-title':
            await updateProfile({ professionalTitle: command.value });
            results.push('Updated your saved professional title.');
            break;

          case 'add-role': {
            const exists = profile.targetRoles.some(
              (item) => item.toLowerCase() === command.value.toLowerCase(),
            );
            if (!exists) {
              await updateProfile({
                targetRoles: [...profile.targetRoles, command.value],
              });
            }
            results.push(
              exists
                ? `"${command.value}" is already in your saved target roles.`
                : `Added "${command.value}" to your saved target roles.`,
            );
            break;
          }

          case 'remove-role': {
            const next = profile.targetRoles.filter(
              (item) => item.toLowerCase() !== command.value.toLowerCase(),
            );
            if (next.length === profile.targetRoles.length) {
              results.push(`"${command.value}" was not found in your saved target roles. No changes made.`);
            } else {
              await updateProfile({ targetRoles: next });
              results.push(`Removed "${command.value}" from your saved target roles.`);
            }
            break;
          }

          case 'set-link': {
            try {
              new URL(command.value);
            } catch {
              results.push('That link is not a valid URL. No changes made.');
              break;
            }
            await updateProfile({
              links: { [command.field]: command.value },
            });
            results.push(`Updated your saved ${command.field} link.`);
            break;
          }
        }

        profile = await getProfile();
        results.push(
          `Verified: skills [${profile.skills.join(', ')}]; target roles [${profile.targetRoles.join(', ')}]; title [${profile.professionalTitle}]; About [${profile.about}].`,
        );
      }

      yield {
        author: this.name,
        invocationId: context.invocationId,
        content: {
          role: 'model',
          parts: [{ text: results.join('\n\n') }],
        },
      };
      return;
    }

    yield* this.assistant.runAsync(context);
  }

  async *runLiveImpl(
    context: InvocationContext,
  ): AsyncGenerator<Event, void, undefined> {
    yield* this.assistant.runLive(context);
  }
}
