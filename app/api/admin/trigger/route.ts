import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/session';
import { isJobName, runJob, JOBS } from '@/lib/jobs';
import type { TemplateType } from '@/lib/llm/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Verify the admin session before allowing manual job execution.
  if (!(await requireAdminSession(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Validate the requested job and optional template override.
  const body = (await req.json().catch(() => ({}))) as {
    job?: string;
    forceTemplate?: TemplateType;
  };

  if (!isJobName(body.job)) {
    return NextResponse.json(
      { error: `job must be one of: ${JOBS.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    // Run the selected job and return its result.
    const result = await runJob(body.job, body.forceTemplate);

    return NextResponse.json({
      ok: true,
      job: body.job,
      result,
    });
  } catch (err) {
    // Return job execution errors to the admin client.
    return NextResponse.json(
      {
        ok: false,
        job: body.job,
        error: (err as Error).message,
      },
      { status: 500 },
    );
  }
}
