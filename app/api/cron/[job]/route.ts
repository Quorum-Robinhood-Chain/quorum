import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/auth/cron';
import { isJobName, runJob, JOBS } from '@/lib/jobs';

// Scheduled entry point. Vercel Cron calls these with GET + a bearer token (see vercel.json);
// any external scheduler can use the x-cron-secret header instead.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // generation is the slow one

export async function GET(
  req: NextRequest,
  { params }: { params: { job: string } },
) {
  // Verify the cron request before running any scheduled job.
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Validate the requested job name.
  if (!isJobName(params.job)) {
    return NextResponse.json(
      { error: `job must be one of: ${JOBS.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    // Run the scheduled job and return its result.
    const result = await runJob(params.job);

    return NextResponse.json({
      ok: true,
      job: params.job,
      result,
    });
  } catch (err) {
    // Return job execution errors to the scheduler.
    return NextResponse.json(
      {
        ok: false,
        job: params.job,
        error: (err as Error).message,
      },
      { status: 500 },
    );
  }
}
