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
        'rounded-lg border/90 bg-card shadow-sm print:border print:shadow-none',
        className
      )}
    >
      <div className="border-b border-blue-100 bg-blue-50/60 px-4 py-2.5 md:px-5">
        <h3 className="text-sm font-semibold text-blue-950">{title}</h3>
      </div>
      <div className="px-4 py-3 text-sm text-foreground md:px-5 md:py-4">{children}</div>
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
  if (payload?.insufficientData && reportType !== 'integrated') {
    return (
      <div className="rounded-lg border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
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
    case 'integrated':
      return <IntegratedReportView data={payload} />;
    default:
      return <pre className="max-h-[480px] overflow-auto rounded border bg-background p-3 text-xs">{JSON.stringify(payload, null, 2)}</pre>;
  }
}

function IntegratedReportView({ data }: { data: Record<string, unknown> }) {
  const childInfo = data.childInfo as { childName?: string; age?: number | null } | undefined;
  const duration = data.therapyDuration as
    | { firstSessionDate?: string; lastSessionDate?: string; spanDays?: number | null; completedSessionCount?: number }
    | undefined;
  const goals = (data.goalProgressTable || []) as Array<{
    goalName?: string;
    baseline?: number | null;
    current?: number | null;
    target?: number | null;
    trend?: string;
    masteryStatus?: string;
  }>;
  const domains = (data.domainPerformance || []) as Array<{ name?: string; score?: number; status?: string }>;
  const weekly = (data.trendGraphData as { weeklyTrend?: { x?: string; y?: number }[] } | undefined)?.weeklyTrend || [];
  const metrics = data.overallMetrics as { overallScore?: number; improvementRate?: number; consistency?: number } | undefined;
  const notes = (data.therapistNotes || []) as string[];
  const rec = (data.recommendations || []) as string[];

  return (
    <div className="space-y-4">
      <Section title="Child & case">
        <p className="font-medium text-foreground">{childInfo?.childName || 'Child'}</p>
        {childInfo?.age != null ? <p className="text-muted-foreground">Age: {childInfo.age} yrs</p> : null}
      </Section>
      <Section title="Therapy duration">
        <p className="text-foreground">
          Sessions completed: {duration?.completedSessionCount ?? '—'}
          {duration?.spanDays != null ? ` · span ~${duration.spanDays} days` : ''}
        </p>
        <p className="text-xs text-muted-foreground">
          First: {duration?.firstSessionDate ? new Date(duration.firstSessionDate).toLocaleDateString() : '—'} · Last:{' '}
          {duration?.lastSessionDate ? new Date(duration.lastSessionDate).toLocaleDateString() : '—'}
        </p>
      </Section>
      <Section title="Overall metrics (progress engine)">
        <ul className="list-inside list-disc space-y-1 text-foreground">
          <li>Composite score (0–5): {metrics?.overallScore != null ? metrics.overallScore.toFixed(2) : '—'}</li>
          <li>Improvement rate: {metrics?.improvementRate != null ? metrics.improvementRate : '—'}</li>
          <li>Assignment consistency: {metrics?.consistency != null ? `${(metrics.consistency * 100).toFixed(0)}%` : '—'}</li>
        </ul>
      </Section>
      <Section title="Domain performance (clinical buckets)">
        <ul className="space-y-1">
          {domains.map((d) => (
            <li key={String(d.name)} className="flex justify-between gap-2">
              <span className="capitalize">{d.name}</span>
              <span className="text-muted-foreground">
                {d.score?.toFixed(2)} / 5 · {d.status}
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Weekly trend (chart-ready)">
        <ul className="space-y-1 text-xs text-muted-foreground">
          {weekly.length === 0 ? <li>No weekly aggregates yet.</li> : null}
          {weekly.map((w, i) => (
            <li key={i}>
              {w.x}: {w.y}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Goal progress">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-2">Goal</th>
                <th className="py-1 pr-2">Base</th>
                <th className="py-1 pr-2">Current</th>
                <th className="py-1 pr-2">Target</th>
                <th className="py-1">Trend</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-1 pr-2 font-medium text-foreground">{g.goalName || '—'}</td>
                  <td className="py-1 pr-2 tabular-nums">{g.baseline ?? '—'}</td>
                  <td className="py-1 pr-2 tabular-nums">{g.current ?? '—'}</td>
                  <td className="py-1 pr-2 tabular-nums">{g.target ?? '—'}</td>
                  <td className="py-1 capitalize">{g.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Therapist notes (recent)">
        {notes.length ? (
          <ul className="list-inside list-disc space-y-1">
            {notes.slice(-8).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No notes captured.</p>
        )}
      </Section>
      <Section title="Recommendations">
        <ul className="list-inside list-disc space-y-1">
          {rec.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
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
        <p className="font-medium text-foreground">
          Domains: {Array.isArray(plan?.domains) && plan?.domains?.length ? plan.domains.join(', ') : '—'}
        </p>
        {plan?.longTermGoal?.title ? (
          <p className="mt-2 text-foreground">
            Long-term goal: <span className="font-medium">{plan.longTermGoal.title}</span>
          </p>
        ) : null}
      </Section>

      <Section title="Short-term goals">
        <ul className="space-y-1.5">
          {(plan?.shortTermGoals || []).map((g, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{g.title}</span>
              <span className="text-muted-foreground">
                {g.domain} · {g.status}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Progress">
        <p className="mb-2">
          Overall progress: <span className="font-semibold text-blue-900">{progress?.overallProgressPercent ?? 0}%</span>
        </p>
        <ul className="space-y-1">
          {(progress?.domains || []).map((d, i) => (
            <li key={i} className="text-foreground">
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
          <p className="text-muted-foreground">No sessions available for this case.</p>
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
            <li key={i} className="flex justify-between gap-2 border-b border pb-1 last:border-0">
              <span>{row.sessionDate ? new Date(row.sessionDate).toLocaleDateString() : 'Session'}</span>
              <span className="text-muted-foreground">
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
        <p className="text-lg font-semibold text-blue-900">{p?.overallProgressPercent ?? 0}%</p>
      </Section>
      <Section title="Domain progress">
        <ul className="space-y-1.5">
          {(p?.domainProgress || []).map((d, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{d.domain}</span>
              <span className="text-muted-foreground">
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
              <span className="text-muted-foreground">{g.progressPercent}%</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Attention areas">
        {flags.length === 0 ? (
          <p className="text-blue-800">No major attention flags from current analytics.</p>
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
            <dt className="text-xs font-medium uppercase text-muted-foreground">Name</dt>
            <dd className="font-medium text-foreground">{String(childInfo?.childName ?? '—')}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Age</dt>
            <dd>{childInfo?.age != null ? `${childInfo.age} years` : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Case status</dt>
            <dd>{String(childInfo?.caseStatus ?? '—')}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Therapy domains">
        <ul className="list-inside list-disc text-foreground">
          {Array.isArray(data.therapyDomains) && (data.therapyDomains as string[]).length ? (
            (data.therapyDomains as string[]).map((d) => <li key={d}>{d}</li>)
          ) : (
            <li className="text-muted-foreground">No domains listed on the current plan.</li>
          )}
        </ul>
      </Section>

      <Section title="Goals progress">
        <p className="mb-2 text-muted-foreground">
          Overall: <span className="font-semibold text-blue-900">{goals?.overallProgressPercent ?? 0}%</span>
        </p>
        <ul className="space-y-1.5">
          {(goals?.goals || []).map((g: { goalName?: string; progressPercent?: number; status?: string }, i: number) => (
            <li key={i} className="flex flex-wrap justify-between gap-2 border-b border pb-1 last:border-0">
              <span>{g.goalName}</span>
              <span className="text-muted-foreground">
                {g.progressPercent}% · {g.status}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Session summary">
        {sess?.skipped ? (
          <p className="text-muted-foreground">No session logs for this period.</p>
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
          <p className="text-muted-foreground">No activities recorded in sessions.</p>
        ) : (
          <ul className="space-y-1.5">
            {activities.slice(0, 12).map((row: { activityName?: string; usageCount?: number; avgChildResponse?: number | null }, i: number) => (
              <li key={i} className="flex justify-between gap-2">
                <span>{row.activityName}</span>
                <span className="text-muted-foreground">
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
          <ul className="space-y-1.5 text-foreground">
            <li>Total assignments: {String(assign.total ?? 0)}</li>
            <li>Pending: {String(assign.pending ?? 0)}</li>
            <li>Submitted / reviewed: {String(assign.submitted ?? 0)}</li>
            <li>Completed: {String(assign.completed ?? 0)}</li>
            {assign.percentages ? (
              <li className="text-xs text-muted-foreground">
                Distribution: pending {String((assign.percentages as { pending?: number }).pending ?? 0)}% · submitted{' '}
                {String((assign.percentages as { submitted?: number }).submitted ?? 0)}% · completed{' '}
                {String((assign.percentages as { completed?: number }).completed ?? 0)}%
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-muted-foreground">No assignment data.</p>
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
          <p className="text-muted-foreground">No long-term goals recorded.</p>
        ) : (
          <ul className="space-y-1.5">
            {lt.map((g: { title?: string; description?: string; timeline?: string }, i: number) => (
              <li key={i} className="rounded-lg border bg-background/50 p-3">
                <p className="font-medium text-foreground">{g.title}</p>
                {g.description ? <p className="mt-1 text-muted-foreground">{g.description}</p> : null}
                {g.timeline ? <p className="mt-1 text-xs text-muted-foreground">Timeline: {g.timeline}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Short-term goals">
        {st.length === 0 ? (
          <p className="text-muted-foreground">No short-term goals recorded.</p>
        ) : (
          <ul className="space-y-1.5">
            {st.map(
              (
                g: { title?: string; domain?: string; status?: string; measurableCriteria?: string; reviewDate?: string | null },
                i: number
              ) => (
                <li key={i} className="flex flex-col gap-0.5 border-b border pb-2 last:border-0">
                  <span className="font-medium text-foreground">{g.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {g.domain} · {g.status}
                    {g.reviewDate ? ` · review ${new Date(g.reviewDate).toLocaleDateString()}` : ''}
                  </span>
                  {g.measurableCriteria ? <span className="text-sm text-muted-foreground">{g.measurableCriteria}</span> : null}
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
                <span className="text-muted-foreground">
                  {g.status} · {g.progressPercent}%
                </span>
              </li>
            )
          )}
        </ul>
      </Section>

      <Section title="Recommended strategies (from plan activities)">
        {strategies.length === 0 ? (
          <p className="text-muted-foreground">No activities listed on the plan.</p>
        ) : (
          <ul className="space-y-1.5">
            {strategies.map((s, i) => (
              <li key={i}>
                <span className="font-medium">{s.title}</span>
                {s.description ? <span className="text-muted-foreground"> — {s.description}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Review timeline">
        <p className="text-foreground">
          Typical review cadence: {timeline?.weeksRange?.min ?? 4}–{timeline?.weeksRange?.max ?? 6} weeks.
        </p>
        {timeline?.suggestedReviewBy ? (
          <p className="mt-2 text-sm text-muted-foreground">
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
          <p className="text-muted-foreground">{String(dx.message)}</p>
        ) : (
          <>
            {dx?.diagnosis ? <p className="font-medium text-foreground">{String(dx.diagnosis)}</p> : null}
            {Array.isArray(dx?.comorbidConditions) && (dx!.comorbidConditions as string[]).length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Comorbid: {(dx!.comorbidConditions as string[]).join(', ')}
              </p>
            ) : null}
            {dx?.developmentalSummary ? (
              <p className="mt-2 text-sm text-foreground">{String(dx.developmentalSummary)}</p>
            ) : null}
            {dx?.observations ? (
              <p className="mt-2 text-sm text-foreground">{String(dx.observations)}</p>
            ) : null}
          </>
        )}
      </Section>

      <Section title="Therapy progress summary">
        <p className="mb-2">
          Overall progress index:{' '}
          <span className="font-semibold text-blue-900">{summary?.overallProgress ?? 0}%</span>
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
              <span className="text-muted-foreground">
                {d.progressPercent}% · trend: {d.trend}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Alerts (low progress / declining trend)">
        {flags.length === 0 ? (
          <p className="text-blue-800">No automated red flags from current analytics data.</p>
        ) : (
          <ul className="space-y-1.5">
            {flags.map((f, i) => (
              <li key={i} className="rounded-lg border-yellow-200 bg-yellow-50 px-3 py-2 text-yellow-900">
                <span className="font-medium">{f.domain}</span>: {f.reason}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Therapist observations (recent session notes)">
        {obs.length === 0 ? (
          <p className="text-muted-foreground">No session notes available.</p>
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
        <p className="text-lg font-semibold text-foreground">{String(childInfo?.childName ?? 'Child')}</p>
        <p className="text-sm text-muted-foreground">This summary is generated from therapy sessions and goals — read-only.</p>
      </Section>

      <Section title="Progress summary">
        <p className="leading-relaxed text-foreground">{String(data.progressSummary ?? '')}</p>
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
