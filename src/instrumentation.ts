// Runs once when the server starts. Logs a clear configuration report so a
// misconfigured deployment (e.g. Vercel without environment variables) is
// obvious in the platform logs instead of surfacing as generic 500s.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { checkEnv, envProblems } = await import('./lib/env-check');
  const problems = envProblems(checkEnv());
  if (problems.length === 0) {
    console.info('[config] environment OK');
    return;
  }
  console.error('[config] configuration problems detected — pages depending on them will show "temporarily unavailable":');
  for (const p of problems) console.error(`  - ${p.key}: ${p.status}${p.note ? ` (${p.note})` : ''}`);
  console.error('  See docs/DEPLOYMENT.md. GET /api/health returns this report as JSON.');
}
