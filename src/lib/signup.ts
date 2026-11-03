// Signup is open only when a build carries both the signup endpoint and the signups-only key (see src/env.d.ts).
// Release builds reject both (scripts/assert-release-env.mjs), so every published page has signup off.
export const signupOpen = Boolean(import.meta.env.PUBLIC_SIGNUP_URL && import.meta.env.PUBLIC_SIGNUP_KEY);
