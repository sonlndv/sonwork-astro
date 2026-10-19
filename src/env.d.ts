interface ImportMetaEnv {
  /** "true" shows draft content in a build (structure review, preview). */
  readonly SHOW_DRAFTS?: string;
  /** Signup endpoint for the subscribe form (mailcheap POST /api/v1/contacts). Unset: submit is disabled. */
  readonly PUBLIC_SIGNUP_URL?: string;
  /** A signups only API key: public by design, it can only add contacts. Unset: submit is disabled. Never a full access key. */
  readonly PUBLIC_SIGNUP_KEY?: string;
  /** The newsletter's slug or ID. Unset: the account's first newsletter. */
  readonly PUBLIC_SIGNUP_NEWSLETTER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
