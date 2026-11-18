import {
  BaseAgent,
  createEventActions,
  InvocationContext,
  LlmAgent,
} from '@google/adk';
import type { Event } from '@google/adk';

import { getProfile, updateProfile } from '../data/profile-store.js';

function extractLocalSkillAddition(message: string): string | null {
  if (!/\b(?:local|saved)\b/i.test(message)) {
    return null;
  }

  const match = message.match(
    /\b(?:add|include|append)\s+(?:the\s+skill\s+)?["']?([a-z0-9+#./ -]+?)["']?\s+(?:to|into)\s+(?:my\s+)?(?:(?:local|saved)\s+)*(?:technical\s+)?skills\b/i,
  );

  return match?.[1]?.trim().replace(/[.!?,;]+$/, '') || null;
}

export class ProfileAwareAgent extends BaseAgent {
  private readonly assistant: LlmAgent;

  constructor(assistant: LlmAgent) {
    super({
      name: 'profile_aware_router',
      description:
        'Routes explicit local profile skill additions through deterministic application logic and delegates other requests to the conversational assistant.',
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

    const skillToAdd = extractLocalSkillAddition(message);

    if (skillToAdd) {
      const currentProfile = await getProfile();
      const alreadyExists = currentProfile.skills.some(
        (skill) => skill.toLowerCase() === skillToAdd.toLowerCase(),
      );

      if (!alreadyExists) {
        await updateProfile({
          skills: [...currentProfile.skills, skillToAdd],
        });
      }

      const verifiedProfile = await getProfile();
      const skills = verifiedProfile.skills.join(', ');
      const status = alreadyExists
        ? `${skillToAdd} was already present, so no change was needed.`
        : `${skillToAdd} was added to your local saved profile.`;

      yield {
        id: crypto.randomUUID(),
        invocationId: context.invocationId,
        author: this.name,
        content: {
          role: 'model',
          parts: [{ text: `${status}\n\nVerified saved skills: ${skills}` }],
        },
        actions: createEventActions(),
        timestamp: Date.now(),
      };
      return;
    }

    for await (const event of this.assistant.runAsync(context)) {
      yield event;
    }
  }

  async *runLiveImpl(
    context: InvocationContext,
  ): AsyncGenerator<Event, void, undefined> {
    for await (const event of this.assistant.runLive(context)) {
      yield event;
    }
  }
}
