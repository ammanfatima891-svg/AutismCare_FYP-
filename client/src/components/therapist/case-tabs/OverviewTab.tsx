import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { TherapistCaseFileData } from './caseFileTypes';

type Props = { data: TherapistCaseFileData };

export function OverviewTab({ data }: Props) {
  const { child, parent, referral, domainTags, case: caseInfo } = data;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border bg-card shadow-sm">
        <CardHeader className="border-b border border-border bg-secondary/20">
          <CardTitle className="text-base text-foreground">Child profile</CardTitle>
          <CardDescription>Demographics for this case</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            <span className="font-medium text-foreground">
              {child.firstName} {child.lastName}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Age: </span>
            <span className="text-foreground">{child.age != null ? `${child.age} yrs` : '—'}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Gender: </span>
            <span className="capitalize text-foreground">{child.gender || '—'}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="border bg-card shadow-sm">
        <CardHeader className="border-b border border-border bg-secondary/20">
          <CardTitle className="text-base text-foreground">Parent / guardian</CardTitle>
          <CardDescription>Primary contact</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            <span className="font-medium text-foreground">
              {parent.firstName} {parent.lastName}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Contact: </span>
            <span className="text-foreground">{parent.contact || parent.email || '—'}</span>
          </p>
          {parent.email ? (
            <p>
              <span className="text-muted-foreground">Email: </span>
              <span className="text-foreground">{parent.email}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border bg-card shadow-sm md:col-span-2">
        <CardHeader className="border-b border border-border bg-secondary/20">
          <CardTitle className="text-base text-foreground">Referral (clinician)</CardTitle>
          <CardDescription>Reason, priority, and notes from referral</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3 text-sm">
          {!referral ? (
            <p className="text-muted-foreground">No referral record linked to your specialization for this case.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-muted-foreground">Reason / type:</span>
                <Badge variant="outline" className="bg-card">
                  {referral.reasonForReferral || referral.therapistType}
                </Badge>
                <span className="text-muted-foreground ml-2">Priority:</span>
                <Badge
                  variant="outline"
                  className={
                    referral.priority === 'high'
                      ? 'border bg-muted text-destructive'
                      : referral.priority === 'medium'
                        ? 'border-border bg-accent/10 text-accent-foreground'
                        : 'border-border bg-secondary/50 text-primary'
                  }
                >
                  {referral.priority}
                </Badge>
                <span className="text-muted-foreground ml-2">Referral status:</span>
                <Badge variant="secondary">{referral.status}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Notes</p>
                <p className="text-foreground whitespace-pre-wrap rounded-md border bg-muted/80 p-3">
                  {referral.notes?.trim() ? referral.notes : 'No notes provided.'}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border bg-card shadow-sm md:col-span-2">
        <CardHeader className="border-b border border-border bg-secondary/20">
          <CardTitle className="text-base text-foreground">Assigned therapy domains</CardTitle>
          <CardDescription>Derived from the active therapy plan (or standard domains)</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {domainTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No domains in the therapy plan yet. Standard domains include Speech, OT, Behavioral, Sensory, AAC, and PECS.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {domainTags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-border bg-secondary/40 text-primary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Case status: <span className="font-medium text-foreground">{caseInfo.status}</span> · Risk:{' '}
            <span className="font-medium text-foreground">{caseInfo.riskLevel}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
