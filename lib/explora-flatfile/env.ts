/**
 * Env-derived config for the Explora flatfile pipeline.
 *
 * Reads:
 *   EXPLORA_ENV         "preprod" | "prod" (default: "preprod")
 *   EXPLORA_USERNAME    required at call-time
 *   EXPLORA_PASSWORD    required at call-time
 *   EXPLORA_AUTH_URL    optional override
 *   EXPLORA_FILES_URL   optional override
 *
 * Throws with an actionable message when credentials are missing. Never
 * includes the password in any error string.
 */

export type ExploraEnv = 'preprod' | 'prod';

const DEFAULTS: Record<ExploraEnv, { auth: string; files: string }> = {
  preprod: {
    auth: 'https://explorajourneys-b2b.oktapreview.com/api/v1/authn',
    files: 'https://preprod.techpartner.explorajourneys.com/ota/file/operations/system/',
  },
  prod: {
    auth: 'https://idpb2b.explorajourneys.com/api/v1/authn',
    files: 'https://techpartner.explorajourneys.com/ota/file/operations/system/',
  },
};

export interface ExploraConfig {
  env: ExploraEnv;
  authUrl: string;
  filesUrl: string;
  username: string;
  password: string;
}

export class ExploraEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExploraEnvError';
  }
}

export function getExploraConfig(): ExploraConfig {
  const envRaw = (process.env.EXPLORA_ENV ?? 'preprod').toLowerCase();
  if (envRaw !== 'preprod' && envRaw !== 'prod') {
    throw new ExploraEnvError(
      `EXPLORA_ENV must be "preprod" or "prod"; got "${envRaw}".`,
    );
  }
  const env = envRaw as ExploraEnv;

  const username = process.env.EXPLORA_USERNAME?.trim();
  const password = process.env.EXPLORA_PASSWORD;
  if (!username) {
    throw new ExploraEnvError(
      'EXPLORA_USERNAME is not set. Add it to .env.local (the Okta partner email).',
    );
  }
  if (!password) {
    throw new ExploraEnvError(
      'EXPLORA_PASSWORD is not set. Add it to .env.local (the Okta partner password).',
    );
  }

  const authUrl = (process.env.EXPLORA_AUTH_URL ?? DEFAULTS[env].auth).trim();
  const filesUrl = (process.env.EXPLORA_FILES_URL ?? DEFAULTS[env].files).trim();

  return { env, authUrl, filesUrl, username, password };
}
