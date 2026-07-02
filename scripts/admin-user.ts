/**
 * Create / reset / disable an admin-console user (no public signup exists).
 *
 *   npm run admin:user -- --email you@x.gr --name "Kostas A." --role admin --password 'S3cret!'
 *   npm run admin:user -- --email you@x.gr --name "Kostas A." --role admin     # prompts for password on stdin
 *   npm run admin:user -- --email staff@x.gr --role agent --password '...'      # agent role
 *   npm run admin:user -- --disable --email old@x.gr                            # disable a user
 *   npm run admin:user -- --list                                               # list users
 *
 * Re-running with an existing email resets that user's name/role/password and re-enables them.
 */

import { existsSync, readFileSync } from 'node:fs';

// Lightweight .env loader (same as scripts/migrate.ts).
for (const path of ['.env.local', '.env']) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

import { db } from '../lib/db/client';
import { hashPassword, type AdminRole } from '../lib/admin-auth';

const ARGS = process.argv.slice(2);
function flag(name: string): string | null {
  const i = ARGS.indexOf(`--${name}`);
  if (i === -1) return null;
  const v = ARGS[i + 1];
  return v && !v.startsWith('--') ? v : '';
}
const has = (name: string) => ARGS.includes(`--${name}`);

function readStdinLine(): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write('Password: ');
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (d) => {
      buf += d;
      if (buf.includes('\n')) {
        process.stdin.pause();
        resolve(buf.split('\n')[0].trim());
      }
    });
  });
}

async function main() {
  const sql = db();

  if (has('list')) {
    const rows = (await sql`
      SELECT id, email, name, role, disabled, created_at, last_login_at
      FROM admin_users ORDER BY created_at
    `) as Array<Record<string, unknown>>;
    if (!rows.length) {
      console.log('No admin users yet. Create one with --email --name --role.');
      return;
    }
    for (const r of rows) {
      console.log(
        `#${r.id}  ${r.email}  [${r.role}]${r.disabled ? ' DISABLED' : ''}  "${r.name}"  ` +
          `last login: ${r.last_login_at ?? 'never'}`,
      );
    }
    return;
  }

  const email = (flag('email') || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('✗ --email <valid email> is required.');
    process.exit(1);
  }

  if (has('disable')) {
    const rows = (await sql`
      UPDATE admin_users SET disabled = true WHERE lower(email) = ${email} RETURNING id, email
    `) as Array<{ id: number; email: string }>;
    if (!rows.length) { console.error(`✗ no user with email ${email}`); process.exit(1); }
    console.log(`✓ disabled ${rows[0].email} (#${rows[0].id})`);
    return;
  }

  const name = (flag('name') || '').trim();
  const role = ((flag('role') || 'agent').trim() as AdminRole);
  if (role !== 'admin' && role !== 'agent') {
    console.error("✗ --role must be 'admin' or 'agent'.");
    process.exit(1);
  }
  if (!name) {
    console.error('✗ --name "<display name>" is required when creating/updating a user.');
    process.exit(1);
  }

  let password = flag('password');
  if (password == null || password === '') password = await readStdinLine();
  if (!password || password.length < 8) {
    console.error('✗ password must be at least 8 characters.');
    process.exit(1);
  }

  const password_hash = await hashPassword(password);
  const rows = (await sql`
    INSERT INTO admin_users (email, password_hash, name, role)
    VALUES (${email}, ${password_hash}, ${name}, ${role})
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          disabled = false
    RETURNING id, email, role, (xmax = 0) AS inserted
  `) as Array<{ id: number; email: string; role: string; inserted: boolean }>;
  const r = rows[0];
  console.log(`✓ ${r.inserted ? 'created' : 'updated'} ${r.email} [${r.role}] (#${r.id})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`✗ admin:user failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
