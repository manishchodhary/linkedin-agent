import test from 'node:test';
import assert from 'node:assert/strict';
import { matchOpportunity } from '../src/matching/profile-match.js';
import type { Profile } from '../src/data/profile.schema.js';

const profile: Profile = {
  fullName: 'Test User',
  professionalTitle: 'Backend Engineer',
  about: '',
  skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'CI/CD'],
  targetRoles: ['Backend Engineering', 'DevOps'],
  links: { github: 'https://github.com/test', portfolio: 'https://example.com', linkedin: 'https://linkedin.com/in/test' },
};

test('finds matches/missing skills and recommends apply for aligned backend role', () => {
  const report = matchOpportunity(profile, 'Backend developer internship. Required: TypeScript, Node.js, PostgreSQL, Redis, Docker.');
  assert.deepEqual(report.matchedSkills, ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker']);
  assert.deepEqual(report.missingSkills, ['Redis']);
  assert.deepEqual(report.roleAlignment, ['Backend']);
  assert.equal(report.recommendation, 'apply');
  assert.ok(report.score >= 70);
});
test('role/skill detection does not confuse Java with JavaScript', () => {
  const report = matchOpportunity(profile, 'Frontend role using JavaScript and React.');
  assert.deepEqual(report.detectedRoles, ['Frontend']);
  assert.deepEqual(report.matchedSkills, []);
  assert.deepEqual(report.missingSkills, ['JavaScript', 'React']);
  assert.equal(report.recommendation, 'skip');
});
test('handles description without recognized skills or role', () => {
  const report = matchOpportunity(profile, 'An exciting internship with a motivated team. Apply today.');
  assert.deepEqual(report.matchedSkills, []);
  assert.deepEqual(report.missingSkills, []);
  assert.equal(report.recommendation, 'maybe');
  assert.ok(report.reasons.some((reason) => reason.includes('less reliable')));
});
test('recognizes DevOps aliases and CI/CD terminology', () => {
  const report = matchOpportunity(profile, 'Platform engineering internship with continuous deployment, AWS and K8s.');
  assert.deepEqual(report.detectedRoles, ['DevOps']);
  assert.deepEqual(report.roleAlignment, ['DevOps']);
  assert.deepEqual(report.matchedSkills, ['AWS', 'CI/CD']);
  assert.deepEqual(report.missingSkills, ['Kubernetes']);
});

test('does not mistake common word jobs for JavaScript alias', () => {
  const report = matchOpportunity(profile, 'Backend internship. Jobs are available for motivated students.');
  assert.deepEqual(report.matchedSkills, []);
  assert.deepEqual(report.missingSkills, []);
});
