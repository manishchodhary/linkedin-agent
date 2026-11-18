import type { Profile } from '../data/profile.schema.js';

export type ProfileCommand =
  | { type: 'show' }
  | { type: 'add-skill'; value: string }
  | { type: 'remove-skill'; value: string }
  | { type: 'set-about'; value: string }
  | { type: 'set-title'; value: string }
  | { type: 'add-role'; value: string }
  | { type: 'remove-role'; value: string }
  | { type: 'set-link'; field: keyof Profile['links']; value: string };

function cleanValue(value: string): string {
  return value.trim().replace(/^[\s"'“”]+|[\s"'“”]+$/g, '').replace(/[.!?]+$/, '');
}

export function parseProfileCommand(message: string): ProfileCommand | null {
  const input = message.trim();

  if (/\b(?:linkedin account|linkedin profile)\b/i.test(input)) {
    return null;
  }

  if (!/\b(?:local|saved)\b|\bmy profile\b/i.test(input)) {
    return null;
  }

  if (/\b(?:show|display|view|get)\b.*\b(?:complete\s+)?(?:saved\s+)?profile\b/i.test(input)) {
    return { type: 'show' };
  }

  const patterns: Array<[RegExp, (value: string) => ProfileCommand]> = [
    [
      /\b(?:add|include|append)\s+(?:the\s+skill\s+)?["“]?(.+?)["”]?\s+(?:to|into)\s+(?:my\s+)?(?:(?:local|saved)\s+)*(?:technical\s+)?skills\b/i,
      (value) => ({ type: 'add-skill', value: cleanValue(value) }),
    ],
    [
      /\b(?:remove|delete)\s+(?:the\s+skill\s+)?["“]?(.+?)["”]?\s+from\s+(?:my\s+)?(?:(?:local|saved)\s+)*(?:technical\s+)?skills\b/i,
      (value) => ({ type: 'remove-skill', value: cleanValue(value) }),
    ],
    [
      /\b(?:update|change|set)\s+(?:my\s+)?(?:about(?:\s+section)?|summary)\s+to\s+(.+)$/i,
      (value) => ({ type: 'set-about', value: cleanValue(value) }),
    ],
    [
      /\b(?:update|change|set)\s+(?:my\s+)?(?:professional\s+title|headline)\s+to\s+(.+)$/i,
      (value) => ({ type: 'set-title', value: cleanValue(value) }),
    ],
    [
      /\b(?:add|include)\s+(?:the\s+)?target\s+role\s+["“]?(.+?)["”]?\s+to\s+(?:my\s+)?(?:local\s+|saved\s+)?(?:target\s+)?roles\b/i,
      (value) => ({ type: 'add-role', value: cleanValue(value) }),
    ],
    [
      /\b(?:remove|delete)\s+(?:the\s+)?target\s+role\s+["“]?(.+?)["”]?\s+from\s+(?:my\s+)?(?:local\s+|saved\s+)?(?:target\s+)?roles\b/i,
      (value) => ({ type: 'remove-role', value: cleanValue(value) }),
    ],
    [
      /\b(?:update|change|set)\s+(?:my\s+)?(github|portfolio|linkedin)\s+(?:link|url)\s+to\s+(https?:\/\/\S+)/i,
      (value) => {
        const match = input.match(/\b(?:update|change|set)\s+(?:my\s+)?(github|portfolio|linkedin)\s+(?:link|url)\s+to\s+(https?:\/\/\S+)/i)!;
        return {
          type: 'set-link',
          field: match[1].toLowerCase() as keyof Profile['links'],
          value: cleanValue(value),
        };
      },
    ],
  ];

  for (const [pattern, createCommand] of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) {
      const command = createCommand(match[1]);
      if ('value' in command && !command.value) return null;
      return command;
    }
  }

  return null;
}
