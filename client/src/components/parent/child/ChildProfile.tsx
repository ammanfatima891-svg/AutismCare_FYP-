import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Edit,
  FileText,
  Pill,
  AlertCircle,
  Phone,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { childAPI } from '../../../api';
import { ParentTherapySessionInstructions } from '../ParentTherapySessionInstructions';

interface ChildProfileProps {
  childId: string | number;
  /** When true after navigation from list "Edit", profile opens in edit mode once. */
  initialEditFromList?: boolean;
  onConsumedInitialEdit?: () => void;
}

type ChildDraft = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  pretermWeeks: number;
  medicalHistory: string;
  allergies: string;
  currentMedications: string;
  emergencyContact: string;
  emergencyPhone: string;
};

function childToDraft(c: Record<string, unknown>): ChildDraft {
  const dob = c.dateOfBirth ? new Date(String(c.dateOfBirth)) : new Date();
  return {
    firstName: String(c.firstName ?? ''),
    lastName: String(c.lastName ?? ''),
    dateOfBirth: Number.isNaN(dob.getTime()) ? '' : dob.toISOString().split('T')[0],
    gender: String(c.gender ?? ''),
    pretermWeeks: typeof c.pretermWeeks === 'number' ? c.pretermWeeks : Number(c.pretermWeeks) || 0,
    medicalHistory: String(c.medicalHistory ?? ''),
    allergies: String(c.allergies ?? ''),
    currentMedications: String(c.currentMedications ?? ''),
    emergencyContact: String(c.emergencyContact ?? ''),
    emergencyPhone: String(c.emergencyPhone ?? ''),
  };
}

export function ChildProfile({
  childId,
  initialEditFromList = false,
  onConsumedInitialEdit,
}: ChildProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ChildDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChild = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const childResponse = await childAPI.getChildById(childId);
      setChild(childResponse.data.data);
    } catch (err) {
      setError('Failed to load child data');
      console.error('Error fetching child:', err);
      setChild(null);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    setIsEditing(false);
    setDraft(null);
    loadChild();
  }, [childId, loadChild]);

  useEffect(() => {
    if (!child || !initialEditFromList) return;
    setDraft(childToDraft(child));
    setIsEditing(true);
    onConsumedInitialEdit?.();
  }, [child, initialEditFromList, onConsumedInitialEdit]);

  const beginEdit = () => {
    if (!child) return;
    setDraft(childToDraft(child));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!draft) return;
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!draft.dateOfBirth) {
      toast.error('Please set date of birth');
      return;
    }
    if (!['male', 'female', 'other'].includes(draft.gender)) {
      toast.error('Please select gender');
      return;
    }
    if (!draft.emergencyContact.trim() || !draft.emergencyPhone.trim()) {
      toast.error('Emergency contact name and phone are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        dateOfBirth: new Date(draft.dateOfBirth).toISOString(),
        gender: draft.gender,
        pretermWeeks: draft.pretermWeeks || 0,
        medicalHistory: draft.medicalHistory,
        allergies: draft.allergies,
        currentMedications: draft.currentMedications,
        emergencyContact: draft.emergencyContact.trim(),
        emergencyPhone: draft.emergencyPhone.trim(),
      };
      const res = await childAPI.updateChild(childId, payload);
      setChild(res.data.data);
      toast.success('Profile updated');
      setDraft(null);
      setIsEditing(false);
    } catch (err: unknown) {
      console.error(err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error || !child) {
    return <div className="flex justify-center items-center h-64 text-destructive">{error || 'Child not found'}</div>;
  }

  const fullName = `${child.firstName} ${child.lastName}`;
  const age = Math.floor(
    (new Date().getTime() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader className="ds-card-header-strip border-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-3xl text-primary-foreground">
                {child.firstName[0]}
              </div>
              <div>
                <h2 className="text-primary mb-1">{fullName}</h2>
                <p className="text-muted-foreground">
                  {age} years old • {child.gender}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Born: {new Date(child.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {!isEditing ? (
                <Button variant="outline" onClick={beginEdit} className="hover:bg-muted">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={saveEdit} disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ParentTherapySessionInstructions childId={String(childId)} />

          {isEditing && draft ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-primary">Edit child information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-firstName">First name *</Label>
                    <Input
                      id="edit-firstName"
                      className="mt-1"
                      value={draft.firstName}
                      onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-lastName">Last name *</Label>
                    <Input
                      id="edit-lastName"
                      className="mt-1"
                      value={draft.lastName}
                      onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-dob">Date of birth *</Label>
                    <Input
                      id="edit-dob"
                      type="date"
                      className="mt-1"
                      value={draft.dateOfBirth}
                      max={new Date().toISOString().split('T')[0]}
                      min="1900-01-01"
                      onChange={(e) => setDraft({ ...draft, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-preterm">Preterm weeks</Label>
                    <Input
                      id="edit-preterm"
                      type="number"
                      min={0}
                      max={12}
                      className="mt-1"
                      value={draft.pretermWeeks}
                      onChange={(e) =>
                        setDraft({ ...draft, pretermWeeks: parseInt(e.target.value, 10) || 0 })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Gender *</Label>
                  <RadioGroup
                    value={draft.gender}
                    onValueChange={(v) => setDraft({ ...draft, gender: v })}
                    className="mt-2 flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="edit-male" />
                      <Label htmlFor="edit-male" className="cursor-pointer">
                        Male
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="edit-female" />
                      <Label htmlFor="edit-female" className="cursor-pointer">
                        Female
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="edit-other" />
                      <Label htmlFor="edit-other" className="cursor-pointer">
                        Other
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label htmlFor="edit-medical">Medical history</Label>
                  <Textarea
                    id="edit-medical"
                    rows={3}
                    className="mt-1"
                    value={draft.medicalHistory}
                    onChange={(e) => setDraft({ ...draft, medicalHistory: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-allergies">Allergies</Label>
                  <Input
                    id="edit-allergies"
                    className="mt-1"
                    value={draft.allergies}
                    onChange={(e) => setDraft({ ...draft, allergies: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-meds">Current medications</Label>
                  <Textarea
                    id="edit-meds"
                    rows={2}
                    className="mt-1"
                    value={draft.currentMedications}
                    onChange={(e) => setDraft({ ...draft, currentMedications: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-emergency-name">Emergency contact *</Label>
                    <Input
                      id="edit-emergency-name"
                      className="mt-1"
                      value={draft.emergencyContact}
                      onChange={(e) => setDraft({ ...draft, emergencyContact: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-emergency-phone">Emergency phone *</Label>
                    <Input
                      id="edit-emergency-phone"
                      type="tel"
                      className="mt-1"
                      value={draft.emergencyPhone}
                      onChange={(e) => setDraft({ ...draft, emergencyPhone: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <FileText className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">Full Name</span>
                    <span className="text-foreground">{fullName}</span>
                  </div>
                  <div className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">Age</span>
                    <span className="text-foreground">{age} years</span>
                  </div>
                  <div className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">Gender</span>
                    <span className="text-foreground">{child.gender}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Date of Birth</span>
                    <span className="text-foreground">{new Date(child.dateOfBirth).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Activity className="w-5 h-5" />
                    Medical Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="border-b py-2">
                    <p className="mb-1 text-sm text-muted-foreground">Medical History</p>
                    <p className="text-foreground">{child.medicalHistory || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 border-b py-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Allergies:</span>
                    <span className="text-foreground">{child.allergies || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 py-2">
                    <Pill className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Medications:</span>
                    <span className="text-foreground">{child.currentMedications || '—'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Phone className="w-5 h-5" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">Contact Name</span>
                    <span className="text-foreground">{child.emergencyContact}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Phone Number</span>
                    <span className="text-foreground">{child.emergencyPhone}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
