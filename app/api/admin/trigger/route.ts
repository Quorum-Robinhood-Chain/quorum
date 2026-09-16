import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/session';
import { isJobName, runJob, JOBS } from '@/lib/jobs';
import type { TemplateType } from '@/lib/llm/prompts';

// Manual, out-of-cycle run from the admin dashboard (§6.3). Session cookie only —
// scheduled runs go through /api/cron/[job].
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await requireAdminSession(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { job?: string; forceTemplate?: TemplateType };
  if (!isJobName(body.job)) {
    return NextResponse.json({ error: `job must be one of: ${JOBS.join(', ')}` }, { status: 400 });
  }

  try {
    const result = await runJob(body.job, body.forceTemplate);
    return NextResponse.json({ ok: true, job: body.job, result });
  } catch (err) {
    return NextResponse.json({ ok: false, job: body.job, error: (err as Error).message }, { status: 500 });
  }
}
