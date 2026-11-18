import { BaseAgent, InvocationContext, LlmAgent } from '@google/adk';
import type { Event } from '@google/adk';

import { getProfile, updateProfile } from '../data/profile-store.js';
import { parseProfileCommand } from './profile-commands.js';

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
      .join(' ')
      .trim();

    const command = parseProfileCommand(message);

    if (command) {
      const profile = await getProfile();
      let resultMessage = '';

      switch (command.type) {
        case 'show':
          resultMessage = [
            `Name: ${profile.fullName}`,
            `Professional title: ${profile.professionalTitle}`,
            `About: ${profile.about}`,
            `Skills: ${profile.skills.join(', ')}`,
            `Target roles: ${profile.targetRoles.join(', ')}`,
            `GitHub: ${profile.links.github}`,
            `Portfolio: ${profile.links.portfolio}`,
            `LinkedIn: ${profile.links.linkedin}`,
          ].join('\n');
          break;

        case 'add-skill': {
          const exists = profile.skills.some(
            (item) => item.toLowerCase() === command.value.toLowerCase(),
          );
          if (!exists) {
            await updateProfile({ skills: [...profile.skills, command.value] });
          }
          resultMessage = exists
            ? `"${command.value}" is already in your saved skills.`
            : `Added "${command.value}" to your saved skills.`;
          break;
        }

        case 'remove-skill': {
          const next = profile.skills.filter(
            (item) => item.toLowerCase() !== command.value.toLowerCase(),
          );
          if (next.length === profile.skills.length) {
            resultMessage = `"${command.value}" was not found in your saved skills. No changes made.`;
          } else {
            await updateProfile({ skills: next });
            resultMessage = `Removed "${command.value}" from your saved skills.`;
          }
          break;
        }

        case 'set-about':
          await updateProfile({ about: command.value });
          resultMessage = 'Updated your saved About summary.';
          break;

        case 'set-title':
          await updateProfile({ professionalTitle: command.value });
          resultMessage = 'Updated your saved professional title.';
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
          resultMessage = exists
            ? `"${command.value}" is already in your saved target roles.`
            : `Added "${command.value}" to your saved target roles.`;
          break;
        }

        case 'remove-role': {
          const next = profile.targetRoles.filter(
            (item) => item.toLowerCase() !== command.value.toLowerCase(),
          );
          if (next.length === profile.targetRoles.length) {
            resultMessage = `"${command.value}" was not found in your saved target roles. No changes made.`;
          } else {
            await updateProfile({ targetRoles: next });
            resultMessage = `Removed "${command.value}" from your saved target roles.`;
          }
          break;
        }

        case 'set-link': {
          try {
            new URL(command.value);
          } catch {
            resultMessage = 'That link is not a valid URL. No changes made.';
            break;
          }
          await updateProfile({
            links: { [command.field]: command.value },
          });
          resultMessage = `Updated your saved ${command.field} link.`;
          break;
        }
      }

      const verified = await getProfile();
      const verification = command.type === 'show'
        ? ''
        : `\n\nVerified saved profile:\nSkills: ${verified.skills.join(', ')}\nTarget roles: ${verified.targetRoles.join(', ')}\nProfessional title: ${verified.professionalTitle}\nAbout: ${verified.about}`;

      yield {
        author: this.name,
        invocationId: context.invocationId,
        content: {
          role: 'model',
          parts: [{ text: `${resultMessage}${verification}` }],
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
