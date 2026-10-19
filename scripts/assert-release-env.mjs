import { readdirSync } from 'node:fs';
const localEnv = readdirSync('.').filter(name => /^\.(?:env|dev\.vars)(?:\.|$)/.test(name));
const unsafeNodeEnv = Boolean(process.env.NODE_ENV && process.env.NODE_ENV !== 'production');
if (unsafeNodeEnv || localEnv.length || Object.keys(process.env).some(key => key.startsWith('PUBLIC_SIGNUP') || (key === 'SHOW_DRAFTS' && process.env[key]))) {
  throw new Error('Release builds require no local environment files, signup configuration, SHOW_DRAFTS or nonproduction NODE_ENV');
}
