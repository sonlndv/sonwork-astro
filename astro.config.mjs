// @ts-check
import { writeFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { buildSha } from './scripts/build-release.mjs';
import { writeRuntimeRoutes } from './scripts/runtime-routes.mjs';
import { renderRedirects } from './scripts/redirects-file.mjs';

// Writes release routing and identity alongside public/_redirects from library/redirect-map.csv (git-ignored, generated),
// File output and the host both use URLs without trailing slashes.
/** @returns {import('astro').AstroIntegration} */
function redirectsFile() {
  return {
    name: 'sonwork:redirects-file',
    hooks: {
      'astro:config:setup': ({ config }) => {
        writeRuntimeRoutes();
        writeFileSync(new URL('_redirects', config.publicDir), renderRedirects());
        writeFileSync(new URL('release.json', config.publicDir), JSON.stringify({ gitSHA: buildSha() }) + '\n');
      },
    },
  };
}

export default defineConfig({
  site: 'https://sonwork.org',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [mdx(), redirectsFile()],
});
