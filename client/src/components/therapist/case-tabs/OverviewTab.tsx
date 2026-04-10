import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { TherapistCaseFileData } from './caseFileTypes';

type Props = { data: TherapistCaseFileData };

export function OverviewTab({ data }: Props) {
  const { child, parent, referral, domainTags, case: caseInfo } = data;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-sky-50/50">
          <CardTitle className="text-base text-sky-900">Child profile</CardTitle>
          <CardDescription>Demographics for this case</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-2 text-sm">
          <p>
            <span className="text-slate-500">Name: </span>
            <span className="font-medium text-slate-900">
              {child.firstName} {child.lastName}
            </span>
          </p>
          <p>
            <span className="text-slate-500">Age: </span>
            <span className="text-slate-900">{child.age != null ? `${child.age} yrs` : '—'}</span>
          </p>
          <p>
            <span className="text-slate-500">Gender: </span>
            <span className="capitalize text-slate-900">{child.gender || '—'}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-sky-50/50">
          <CardTitle className="text-base text-sky-900">Parent / guardian</CardTitle>
          <CardDescription>Primary contact</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-2 text-sm">
          <p>
            <span className="text-slate-500">Name: </span>
            <span className="font-medium text-slate-900">
              {parent.firstName} {parent.lastName}
            </span>
          </p>
          <p>
            <span className="text-slate-500">Contact: </span>
            <span className="text-slate-900">{parent.contact || parent.email || '—'}</span>
          </p>
          {parent.email ? (
            <p>
              <span className="text-slate-500">Email: </span>
              <span className="text-slate-900">{parent.email}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm md:col-span-2">
        <CardHeader className="border-b border-slate-100 bg-sky-50/50">
          <CardTitle className="text-base text-sky-900">Referral (clinician)</CardTitle>
          <CardDescription>Reason, priority, and notes from referral</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3 text-sm">
          {!referral ? (
            <p className="text-slate-600">No referral record linked to your specialization for this case.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-slate-500">Reason / type:</span>
                <Badge variant="outline" className="bg-white">
                  {referral.reasonForReferral || referral.therapistType}
                </Badge>
                <span className="text-slate-500 ml-2">Priority:</span>
                <Badge
                  variant="outline"
                  className={
                    referral.priority === 'high'
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : referral.priority === 'medium'
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  }
                >
                  {referral.priority}
                </Badge>
                <span className="text-slate-500 ml-2">Referral status:</span>
                <Badge variant="secondary">{referral.status}</Badge>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Notes</p>
                <p className="text-slate-800 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50/80 p-3">
                  {referral.notes?.trim() ? referral.notes : 'No notes provided.'}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm md:col-span-2">
        <CardHeader className="border-b border-slate-100 bg-sky-50/50">
          <CardTitle className="text-base text-sky-900">Assigned therapy domains</CardTitle>
          <CardDescription>Derived from the active therapy plan (or standard domains)</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {domainTags.length === 0 ? (
            <p className="text-sm text-slate-600">
              No domains in the therapy plan yet. Standard domains include Speech, OT, Behavioral, Sensory, AAC, and PECS.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {domainTags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-sky-200 bg-sky-50 text-sky-900">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Case status: <span className="font-medium text-slate-700">{caseInfo.status}</span> · Risk:{' '}
            <span className="font-medium text-slate-700">{caseInfo.riskLevel}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
