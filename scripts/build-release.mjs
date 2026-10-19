import { execFileSync } from 'node:child_process';

export function buildSha(env = process.env) {
  const sha = env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Release requires a full actual Git commit SHA');
  return sha;
}
