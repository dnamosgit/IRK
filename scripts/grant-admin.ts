// Bootstrap an administrator:  npm run admin:grant -- someone@example.com super_admin
import './_env';
import pg from 'pg';

const [email, role = 'super_admin'] = process.argv.slice(2);
if (!email) {
  console.error('Usage: npm run admin:grant -- <email> [super_admin|moderator|verification_reviewer|data_admin]');
  process.exit(1);
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const u = await db.query('SELECT id FROM private.users WHERE email = $1', [email.toLowerCase()]);
if (!u.rowCount) {
  console.error('No such user. Sign up through the website first.');
  process.exit(1);
}
await db.query('INSERT INTO private.admin_users (user_id, role) VALUES ($1,$2) ON CONFLICT DO NOTHING', [u.rows[0].id, role]);
await db.query(`INSERT INTO private.audit_logs (action, target_type, target_id, metadata) VALUES ('role.granted','user',$1,$2)`, [u.rows[0].id, JSON.stringify({ role, via: 'cli' })]);
console.log(`Granted ${role} to ${email}.`);
await db.end();
