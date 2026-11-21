import type { Profile } from '../data/profile.schema.js';

export type Recommendation = 'apply' | 'maybe' | 'skip';
export type MatchReport = {
  score: number;
  recommendation: Recommendation;
  matchedSkills: string[];
  missingSkills: string[];
  roleAlignment: string[];
  detectedRoles: string[];
  reasons: string[];
};

const skillCatalog: Array<{ label: string; aliases: string[] }> = [
  { label: 'TypeScript', aliases: ['typescript'] },
  { label: 'JavaScript', aliases: ['javascript'] },
  { label: 'Node.js', aliases: ['node.js', 'nodejs', 'node'] },
  { label: 'React', aliases: ['react', 'react.js', 'reactjs'] },
  { label: 'Next.js', aliases: ['next.js', 'nextjs'] },
  { label: 'Express', aliases: ['express', 'express.js'] },
  { label: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
  { label: 'SQL', aliases: ['sql'] },
  { label: 'MongoDB', aliases: ['mongodb', 'mongo'] },
  { label: 'Redis', aliases: ['redis'] },
  { label: 'Docker', aliases: ['docker', 'containerization'] },
  { label: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { label: 'AWS', aliases: ['aws', 'amazon web services'] },
  { label: 'Azure', aliases: ['azure'] },
  { label: 'GCP', aliases: ['gcp', 'google cloud'] },
  { label: 'CI/CD', aliases: ['ci/cd', 'continuous integration', 'continuous delivery', 'continuous deployment'] },
  { label: 'Git', aliases: ['git', 'github'] },
  { label: 'Linux', aliases: ['linux'] },
  { label: 'Python', aliases: ['python'] },
  { label: 'Java', aliases: ['java'] },
  { label: 'C++', aliases: ['c++'] },
  { label: 'C', aliases: ['c language', 'programming in c'] },
  { label: 'REST APIs', aliases: ['rest api', 'restful api', 'rest apis'] },
  { label: 'GraphQL', aliases: ['graphql'] },
  { label: 'Prisma', aliases: ['prisma'] },
  { label: 'Testing', aliases: ['unit testing', 'integration testing', 'testing'] },
  { label: 'WebSockets', aliases: ['websocket', 'websockets', 'socket.io'] },
  { label: 'HTML', aliases: ['html'] },
  { label: 'CSS', aliases: ['css'] },
];

const roleCatalog = [
  { label: 'Backend', aliases: ['backend', 'back-end', 'server-side', 'server side'] },
  { label: 'Full-Stack', aliases: ['full-stack', 'full stack', 'fullstack'] },
  { label: 'Frontend', aliases: ['frontend', 'front-end', 'front end'] },
  { label: 'DevOps', aliases: ['devops', 'dev ops', 'site reliability', 'sre', 'platform engineering', 'platform engineer'] },
  { label: 'Mobile', aliases: ['mobile developer', 'mobile engineer', 'android developer', 'ios developer'] },
  { label: 'Data', aliases: ['data engineer', 'data engineering', 'data scientist', 'analytics engineer'] },
  { label: 'AI/ML', aliases: ['machine learning', 'artificial intelligence', 'ai engineer', 'ml engineer'] },
];

function includesTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^{}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}
function normalized(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}
function detectSkills(text: string): string[] {
  const lower = normalized(text);
  return skillCatalog.filter((skill) => skill.aliases.some((alias) => includesTerm(lower, normalized(alias)))).map((skill) => skill.label);
}
function detectRoles(text: string): string[] {
  const lower = normalized(text);
  return roleCatalog.filter((role) => role.aliases.some((alias) => includesTerm(lower, normalized(alias)))).map((role) => role.label);
}
function roleCategory(role: string): string | undefined {
  const lower = normalized(role);
  return roleCatalog.find((category) => category.aliases.some((alias) => includesTerm(lower, normalized(alias))))?.label;
}

export function matchOpportunity(profile: Profile, opportunityText: string): MatchReport {
  const postingSkills = detectSkills(opportunityText);
  const profileSkillSet = new Set(profile.skills.map(normalized));
  const matchedSkills = postingSkills.filter((skill) => profileSkillSet.has(normalized(skill)));
  const missingSkills = postingSkills.filter((skill) => !profileSkillSet.has(normalized(skill)));
  const detectedRoles = detectRoles(opportunityText);
  const profileRoles = [...profile.targetRoles, profile.professionalTitle]
    .map(roleCategory).filter((role): role is string => Boolean(role));
  const roleAlignment = [...new Set(detectedRoles.filter((role) => profileRoles.includes(role)))];

  const skillScore = postingSkills.length ? (matchedSkills.length / postingSkills.length) * 70 : 35;
  const roleScore = detectedRoles.length ? (roleAlignment.length > 0 ? 30 : 0) : 15;
  const score = Math.round(skillScore + roleScore);
  const recommendation: Recommendation = score >= 70 && roleAlignment.length > 0 ? 'apply' : score >= 40 ? 'maybe' : 'skip';

  const reasons: string[] = [];
  if (postingSkills.length) reasons.push(`Matched ${matchedSkills.length} of ${postingSkills.length} recognized skills mentioned in the posting.`);
  else reasons.push('No recognized technical skills were detected in the posting; the score is less reliable.');
  if (roleAlignment.length) reasons.push(`Role category aligns with your profile: ${roleAlignment.join(', ')}.`);
  else if (detectedRoles.length) reasons.push(`Detected role categories (${detectedRoles.join(', ')}) do not directly align with your saved target roles/title.`);
  else reasons.push('The posting did not clearly identify a recognized role category.');
  if (missingSkills.length) reasons.push(`Consider reviewing these posting skills not listed in your profile: ${missingSkills.join(', ')}.`);
  return { score, recommendation, matchedSkills, missingSkills, roleAlignment, detectedRoles, reasons };
}
