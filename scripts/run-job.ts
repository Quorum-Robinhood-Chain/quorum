// Standalone entry point for running a scheduled job directly on whatever
// process invokes this script — used by .github/workflows/cron.yml for
// `generate` and `weekly-digest`, which call the MiMo LLM API and can run
// past Vercel Hobby's 10s function timeout (see README §7).
//
// `ingest` and `market` stay on the Vercel route (curl'd from the same
// workflow) — both are quick and there's no reason to pay for a second
// code path for them.
//
// Usage: npx tsx scripts/run-job.ts <job>
import { runJob, isJobName, JOBS } from '../lib/jobs';
import { prisma } from '../lib/db';

async function main() {
  const job = process.argv[2];

  if (!isJobName(job)) {
    console.error(`Usage: tsx scripts/run-job.ts <job>`);
    console.error(`Valid jobs: ${JOBS.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[run-job] starting "${job}"...`);
  const startedAt = Date.now();

  try {
    const result = await runJob(job);
    console.log(`[run-job] "${job}" finished in ${Date.now() - startedAt}ms`);
    console.log(JSON.stringify(result, null, 2));

    if (result && typeof result === 'object' && 'flagged' in result && result.flagged) {
      console.log(
        '[run-job] note: article was auto-flagged — check /admin when you get a chance.',
      );
    }
  } catch (err) {
    console.error(
      `[run-job] "${job}" failed after ${Date.now() - startedAt}ms`,
    );
    console.error(err);
    process.exitCode = 1;
  } finally {
    // Runners exit the process right after this script returns — close the
    // connection explicitly rather than relying on process teardown.
    await prisma.$disconnect();
  }
}

main();
