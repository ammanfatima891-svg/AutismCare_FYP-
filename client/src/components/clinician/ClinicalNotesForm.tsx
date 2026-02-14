import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import API from '../../api';

interface ClinicalNotesFormProps {
  appointmentId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ClinicalNotesForm({ appointmentId, onSuccess, onCancel }: ClinicalNotesFormProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    setLoading(true);
    setError('');

    try {
      await API.post(`/appointment/${appointmentId}/notes`, {
        note: note.trim()
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add clinical note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add Clinical Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="note">Clinical Notes</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter detailed clinical observations, assessment findings, and recommendations..."
              rows={8}
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !note.trim()}>
              {loading ? 'Adding Note...' : 'Add Clinical Note'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
