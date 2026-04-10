import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { referralAPI } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Loader2, AlertCircle } from 'lucide-react';

interface ReferralTabProps {
  caseId: string;
}

const therapistTypes = [
  'Speech Therapist',
  'Occupational Therapist',
  'Behavioral Therapist',
  'AAC Specialist',
  'PECS Specialist',
];

const priorities = ['high', 'medium', 'low'];

const priorityBadgeClass: Record<string, string> = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-orange-100 text-orange-800 border-orange-200',
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const statusBadgeClass: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-300',
  accepted: 'bg-blue-100 text-blue-800 border-blue-200',
  'in-progress': 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export function ReferralTab({ caseId }: ReferralTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [finalEvaluationExists, setFinalEvaluationExists] = useState(false);

  const [therapistType, setTherapistType] = useState('');
  const [priority, setPriority] = useState('');
  const [notes, setNotes] = useState('');

  const canCreate = useMemo(
    () => finalEvaluationExists && !!therapistType && !!priority,
    [finalEvaluationExists, therapistType, priority]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await referralAPI.getByCase(caseId);
      setItems(data?.data || []);
      setFinalEvaluationExists(!!data?.meta?.finalEvaluationExists);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      setSaving(true);
      setError(null);
      await referralAPI.create({
        caseId,
        therapistType,
        priority,
        notes: notes.trim(),
      });
      setTherapistType('');
      setPriority('');
      setNotes('');
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create referral');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 bg-blue-50/40">
          <CardTitle className="text-base text-blue-900">Create Referral</CardTitle>
          <CardDescription>
            Assign this case to a therapist pathway after clinical evaluation.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {!finalEvaluationExists && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Finalize clinical evaluation first
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Therapist Type</Label>
              <Select value={therapistType} onValueChange={setTherapistType} disabled={!finalEvaluationExists || saving}>
                <SelectTrigger>
                  <SelectValue placeholder="Select therapist type" />
                </SelectTrigger>
                <SelectContent>
                  {therapistTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority} disabled={!finalEvaluationExists || saving}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional referral notes for therapist."
              rows={4}
              disabled={!finalEvaluationExists || saving}
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={!canCreate || saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Referral
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 bg-blue-50/40">
          <CardTitle className="text-base text-blue-900">Referral History</CardTitle>
          <CardDescription>All referrals linked to this case</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No referrals yet.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.therapistType}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    {item.notes ? <p className="text-sm text-slate-700 mt-1">{item.notes}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={priorityBadgeClass[item.priority] || ''}>
                      {item.priority}
                    </Badge>
                    <Badge variant="outline" className={statusBadgeClass[item.status] || ''}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
