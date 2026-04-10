import React from 'react';
import { cn } from '../ui/utils';

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-lg border border-slate-200/90 bg-white shadow-sm print:border-slate-300 print:shadow-none',
        className
      )}
    >
      <div className="border-b border-sky-100 bg-sky-50/60 px-4 py-2.5 md:px-5">
        <h3 className="text-sm font-semibold text-sky-950">{title}</h3>
      </div>
      <div className="px-4 py-3 text-sm text-slate-700 md:px-5 md:py-4">{children}</div>
    </section>
  );
}

export function ReportDocumentView({
  reportType,
  payload,
}: {
  reportType: string;
  payload: Record<string, unknown>;
}) {
  if (payload?.insufficientData) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        Insufficient data to generate a full report: add a therapy plan, session logs, or home assignments for this
        case.
      </div>
    );
  }

  switch (reportType) {
    case 'monthly':
      return <MonthlyView data={payload} />;
    case 'therapy':
      return <TherapyView data={payload} />;
    case 'session':
      return <SessionView data={payload} />;
    case 'progress':
      return <ProgressView data={payload} />;
    case 'iep':
      return <IepView data={payload} />;
    case 'clinician':
      return <ClinicianView data={payload} />;
    case 'parent':
      return <ParentView data={payload} />;
    default:
      return <pre className="max-h-[480px] overflow-auto rounded border bg-slate-50 p-3 text-xs">{JSON.stringify(payload, null, 2)}</pre>;
  }
}

function TherapyView({ data }: { data: Record<string, unknown> }) {
  const plan = data.therapyPlanSummary as
    | {
        domains?: string[];
        longTermGoal?: { title?: string; description?: string } | null;
        shortTermGoals?: { title?: string; domain?: string; status?: string }[];
      }
    | undefined;
  const progress = data.progress as
    | {
        overallProgressPercent?: number;
        domains?: { domain?: string; progressPercent?: number; trend?: string }[];
      }
    | undefined;

  return (
    <div className="space-y-4">
      <Section title="Therapy plan summary">
        <p className="font-medium text-slate-900">
          Domains: {Array.isArray(plan?.domains) && plan?.domains?.length ? plan.domains.join(', ') : '—'}
        </p>
        {plan?.longTermGoal?.title ? (
          <p className="mt-2 text-slate-700">
            Long-term goal: <span className="font-medium">{plan.longTermGoal.title}</span>
          </p>
        ) : null}
      </Section>

      <Section title="Short-term goals">
        <ul className="space-y-1.5">
          {(plan?.shortTermGoals || []).map((g, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{g.title}</span>
              <span className="text-slate-600">
                {g.domain} · {g.status}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Progress">
        <p className="mb-2">
          Overall progress: <span className="font-semibold text-sky-900">{progress?.overallProgressPercent ?? 0}%</span>
        </p>
        <ul className="space-y-1">
          {(progress?.domains || []).map((d, i) => (
            <li key={i} className="text-slate-700">
              {d.domain}: {d.progressPercent}% ({d.trend})
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function SessionView({ data }: { data: Record<string, unknown> }) {
  const s = data.sessionSummary as
    | {
        totalSessions?: number;
        avgChildResponse?: number | null;
        skipped?: boolean;
        recentSessions?: { sessionDate?: string; duration?: number; status?: string }[];
      }
    | undefined;
  return (
    <div className="space-y-4">
      <Section title="Session overview">
        {s?.skipped ? (
          <p className="text-slate-500">No sessions available for this case.</p>
        ) : (
          <ul className="space-y-1.5">
            <li>Total sessions: {s?.totalSessions ?? 0}</li>
            <li>Average child response: {s?.avgChildResponse != null ? s.avgChildResponse : '—'}</li>
          </ul>
        )}
      </Section>
      <Section title="Recent sessions">
        <ul className="space-y-1.5">
          {(s?.recentSessions || []).map((row, i) => (
            <li key={i} className="flex justify-between gap-2 border-b border-slate-100 pb-1 last:border-0">
              <span>{row.sessionDate ? new Date(row.sessionDate).toLocaleDateString() : 'Session'}</span>
              <span className="text-slate-600">
                {row.duration || 0} min · {row.status || 'completed'}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function ProgressView({ data }: { data: Record<string, unknown> }) {
  const p = data.progressSummary as
    | {
        overallProgressPercent?: number;
        domainProgress?: { domain?: string; progressPercent?: number; trend?: string }[];
        goalProgress?: { goalName?: string; progressPercent?: number }[];
      }
    | undefined;
  const flags = (data.redFlags as { domain?: string; trend?: string; progressPercent?: number }[]) || [];

  return (
    <div className="space-y-4">
      <Section title="Overall progress">
        <p className="text-lg font-semibold text-sky-900">{p?.overallProgressPercent ?? 0}%</p>
      </Section>
      <Section title="Domain progress">
        <ul className="space-y-1.5">
          {(p?.domainProgress || []).map((d, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{d.domain}</span>
              <span className="text-slate-600">
                {d.progressPercent}% · {d.trend}
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Goal progress">
        <ul className="space-y-1.5">
          {(p?.goalProgress || []).map((g, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{g.goalName}</span>
              <span className="text-slate-600">{g.progressPercent}%</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Attention areas">
        {flags.length === 0 ? (
          <p className="text-emerald-800">No major attention flags from current analytics.</p>
        ) : (
          <ul className="space-y-1">
            {flags.map((f, i) => (
              <li key={i}>
                {f.domain}: {f.progressPercent}% ({f.trend})
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function MonthlyView({ data }: { data: Record<string, unknown> }) {
  const childInfo = data.childInfo as Record<string, unknown> | undefined;
  const goals = data.goalsProgress as { overallProgressPercent?: number; goals?: unknown[] } | undefined;
  const sess = data.sessionsSummary as { totalSessions?: number; avgChildResponse?: number | null; skipped?: boolean };
  const activities = (data.activitiesUsed as unknown[]) || [];
  const notes = data.therapistNotes as string[] | undefined;
  const assign = data.assignmentCompliance as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4 print:space-y-3">
      <Section title="Child information">
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Name</dt>
            <dd className="font-medium text-slate-900">{String(childInfo?.childName ?? '—')}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Age</dt>
            <dd>{childInfo?.age != null ? `${childInfo.age} years` : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Case status</dt>
            <dd>{String(childInfo?.caseStatus ?? '—')}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Therapy domains">
        <ul className="list-inside list-disc text-slate-700">
          {Array.isArray(data.therapyDomains) && (data.therapyDomains as string[]).length ? (
            (data.therapyDomains as string[]).map((d) => <li key={d}>{d}</li>)
          ) : (
            <li className="text-slate-500">No domains listed on the current plan.</li>
          )}
        </ul>
      </Section>

      <Section title="Goals progress">
        <p className="mb-2 text-slate-600">
          Overall: <span className="font-semibold text-sky-900">{goals?.overallProgressPercent ?? 0}%</span>
        </p>
        <ul className="space-y-1.5">
          {(goals?.goals || []).map((g: { goalName?: string; progressPercent?: number; status?: string }, i: number) => (
            <li key={i} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-1 last:border-0">
              <span>{g.goalName}</span>
              <span className="text-slate-600">
                {g.progressPercent}% · {g.status}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Session summary">
        {sess?.skipped ? (
          <p className="text-slate-500">No session logs for this period.</p>
        ) : (
          <ul className="space-y-1.5">
            <li>Total sessions: {sess?.totalSessions ?? 0}</li>
            <li>
              Average child response score:{' '}
              {sess?.avgChildResponse != null ? `${sess.avgChildResponse}` : '—'}
            </li>
          </ul>
        )}
      </Section>

      <Section title="Activities used (from session logs)">
        {activities.length === 0 ? (
          <p className="text-slate-500">No activities recorded in sessions.</p>
        ) : (
          <ul className="space-y-1.5">
            {activities.slice(0, 12).map((row: { activityName?: string; usageCount?: number; avgChildResponse?: number | null }, i: number) => (
              <li key={i} className="flex justify-between gap-2">
                <span>{row.activityName}</span>
                <span className="text-slate-600">
                  {row.usageCount} uses
                  {row.avgChildResponse != null ? ` · avg ${row.avgChildResponse}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {notes && notes.length ? (
        <Section title="Therapist notes (recent)">
          <ul className="list-inside list-disc space-y-1">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Home assignment compliance">
        {assign ? (
          <ul className="space-y-1.5 text-slate-700">
            <li>Total assignments: {String(assign.total ?? 0)}</li>
            <li>Pending: {String(assign.pending ?? 0)}</li>
            <li>Submitted / reviewed: {String(assign.submitted ?? 0)}</li>
            <li>Completed: {String(assign.completed ?? 0)}</li>
            {assign.percentages ? (
              <li className="text-xs text-slate-500">
                Distribution: pending {String((assign.percentages as { pending?: number }).pending ?? 0)}% · submitted{' '}
                {String((assign.percentages as { submitted?: number }).submitted ?? 0)}% · completed{' '}
                {String((assign.percentages as { completed?: number }).completed ?? 0)}%
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-slate-500">No assignment data.</p>
        )}
      </Section>
    </div>
  );
}

function IepView({ data }: { data: Record<string, unknown> }) {
  const lt = (data.longTermGoals as unknown[]) || [];
  const st = (data.shortTermGoals as unknown[]) || [];
  const strategies = (data.recommendedStrategies as { title?: string; description?: string }[]) || [];
  const timeline = data.reviewTimeline as { weeksRange?: { min?: number; max?: number }; suggestedReviewBy?: string };

  return (
    <div className="space-y-4">
      <Section title="Long-term goals">
        {lt.length === 0 ? (
          <p className="text-slate-500">No long-term goals recorded.</p>
        ) : (
          <ul className="space-y-1.5">
            {lt.map((g: { title?: string; description?: string; timeline?: string }, i: number) => (
              <li key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                <p className="font-medium text-slate-900">{g.title}</p>
                {g.description ? <p className="mt-1 text-slate-600">{g.description}</p> : null}
                {g.timeline ? <p className="mt-1 text-xs text-slate-500">Timeline: {g.timeline}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Short-term goals">
        {st.length === 0 ? (
          <p className="text-slate-500">No short-term goals recorded.</p>
        ) : (
          <ul className="space-y-1.5">
            {st.map(
              (
                g: { title?: string; domain?: string; status?: string; measurableCriteria?: string; reviewDate?: string | null },
                i: number
              ) => (
                <li key={i} className="flex flex-col gap-0.5 border-b border-slate-100 pb-2 last:border-0">
                  <span className="font-medium text-slate-900">{g.title}</span>
                  <span className="text-xs text-slate-600">
                    {g.domain} · {g.status}
                    {g.reviewDate ? ` · review ${new Date(g.reviewDate).toLocaleDateString()}` : ''}
                  </span>
                  {g.measurableCriteria ? <span className="text-sm text-slate-600">{g.measurableCriteria}</span> : null}
                </li>
              )
            )}
          </ul>
        )}
      </Section>

      <Section title="Goal status (from analytics)">
        <ul className="space-y-1">
          {((data.goalStatusSummary as { goalName?: string; status?: string; progressPercent?: number }[]) || []).map(
            (g, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>{g.goalName}</span>
                <span className="text-slate-600">
                  {g.status} · {g.progressPercent}%
                </span>
              </li>
            )
          )}
        </ul>
      </Section>

      <Section title="Recommended strategies (from plan activities)">
        {strategies.length === 0 ? (
          <p className="text-slate-500">No activities listed on the plan.</p>
        ) : (
          <ul className="space-y-1.5">
            {strategies.map((s, i) => (
              <li key={i}>
                <span className="font-medium">{s.title}</span>
                {s.description ? <span className="text-slate-600"> — {s.description}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Review timeline">
        <p className="text-slate-700">
          Typical review cadence: {timeline?.weeksRange?.min ?? 4}–{timeline?.weeksRange?.max ?? 6} weeks.
        </p>
        {timeline?.suggestedReviewBy ? (
          <p className="mt-2 text-sm text-slate-600">
            Next suggested review anchor: {new Date(timeline.suggestedReviewBy).toLocaleDateString()}
          </p>
        ) : null}
      </Section>
    </div>
  );
}

function ClinicianView({ data }: { data: Record<string, unknown> }) {
  const dx = data.diagnosis as Record<string, unknown> | undefined;
  const summary = data.therapyProgressSummary as { overallProgress?: number; goalProgress?: unknown[] } | undefined;
  const domains = (data.domainAnalysis as { domain?: string; progressPercent?: number; trend?: string }[]) || [];
  const flags = (data.redFlags as { domain?: string; reason?: string }[]) || [];
  const obs = (data.therapistObservations as string[]) || [];

  return (
    <div className="space-y-4">
      <Section title="Diagnosis & clinical context">
        {dx?.message ? (
          <p className="text-slate-600">{String(dx.message)}</p>
        ) : (
          <>
            {dx?.diagnosis ? <p className="font-medium text-slate-900">{String(dx.diagnosis)}</p> : null}
            {Array.isArray(dx?.comorbidConditions) && (dx!.comorbidConditions as string[]).length ? (
              <p className="mt-2 text-sm text-slate-600">
                Comorbid: {(dx!.comorbidConditions as string[]).join(', ')}
              </p>
            ) : null}
            {dx?.developmentalSummary ? (
              <p className="mt-2 text-sm text-slate-700">{String(dx.developmentalSummary)}</p>
            ) : null}
            {dx?.observations ? (
              <p className="mt-2 text-sm text-slate-700">{String(dx.observations)}</p>
            ) : null}
          </>
        )}
      </Section>

      <Section title="Therapy progress summary">
        <p className="mb-2">
          Overall progress index:{' '}
          <span className="font-semibold text-sky-900">{summary?.overallProgress ?? 0}%</span>
        </p>
        <ul className="space-y-1 text-sm">
          {(summary?.goalProgress || []).map((g: { goalName?: string; progressPercent?: number }, i: number) => (
            <li key={i}>
              {g.goalName}: {g.progressPercent}%
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Domain analysis">
        <ul className="space-y-1.5">
          {domains.map((d, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-2">
              <span>{d.domain}</span>
              <span className="text-slate-600">
                {d.progressPercent}% · trend: {d.trend}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Alerts (low progress / declining trend)">
        {flags.length === 0 ? (
          <p className="text-emerald-800">No automated red flags from current analytics data.</p>
        ) : (
          <ul className="space-y-1.5">
            {flags.map((f, i) => (
              <li key={i} className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-amber-950">
                <span className="font-medium">{f.domain}</span>: {f.reason}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Therapist observations (recent session notes)">
        {obs.length === 0 ? (
          <p className="text-slate-500">No session notes available.</p>
        ) : (
          <ul className="list-inside list-disc space-y-1">
            {obs.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function ParentView({ data }: { data: Record<string, unknown> }) {
  const childInfo = data.childInfo as Record<string, unknown> | undefined;
  const imp = (data.improvements as string[]) || [];
  const att = (data.areasNeedingAttention as string[]) || [];
  const tips = (data.homeGuidanceTips as string[]) || [];

  return (
    <div className="space-y-4">
      <Section title="Your child">
        <p className="text-lg font-semibold text-slate-900">{String(childInfo?.childName ?? 'Child')}</p>
        <p className="text-sm text-slate-600">This summary is generated from therapy sessions and goals — read-only.</p>
      </Section>

      <Section title="Progress summary">
        <p className="leading-relaxed text-slate-800">{String(data.progressSummary ?? '')}</p>
      </Section>

      <Section title="What is going well">
        <ul className="list-inside list-disc space-y-1">
          {imp.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Section>

      <Section title="Areas to focus on">
        <ul className="list-inside list-disc space-y-1">
          {att.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Section>

      <Section title="Ideas for home">
        <ul className="list-inside list-disc space-y-1.5">
          {tips.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
