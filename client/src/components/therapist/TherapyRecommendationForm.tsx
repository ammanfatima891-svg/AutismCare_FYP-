import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { therapistAPI } from '../../api';

interface TherapyRecommendationFormProps {
  childId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TherapyRecommendationForm({ childId, onSuccess, onCancel }: TherapyRecommendationFormProps) {
  const [recommendation, setRecommendation] = useState('');
  const [therapyType, setTherapyType] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendation.trim() || !therapyType) return;

    setLoading(true);
    setError('');

    try {
      await therapistAPI.addTherapistRecommendation({
        childId,
        recommendation: recommendation.trim(),
        therapyType,
        frequency,
        duration,
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add therapy recommendation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add Therapy Recommendation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="therapyType">Therapy Type</Label>
            <Select value={therapyType} onValueChange={setTherapyType}>
              <SelectTrigger>
                <SelectValue placeholder="Select therapy type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Speech Therapy">Speech Therapy</SelectItem>
                <SelectItem value="Occupational Therapy">Occupational Therapy</SelectItem>
                <SelectItem value="Physical Therapy">Physical Therapy</SelectItem>
                <SelectItem value="Behavioral Therapy">Behavioral Therapy</SelectItem>
                <SelectItem value="ABA Therapy">ABA Therapy</SelectItem>
                <SelectItem value="Play Therapy">Play Therapy</SelectItem>
                <SelectItem value="Music Therapy">Music Therapy</SelectItem>
                <SelectItem value="Art Therapy">Art Therapy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1x per week">1x per week</SelectItem>
                  <SelectItem value="2x per week">2x per week</SelectItem>
                  <SelectItem value="3x per week">3x per week</SelectItem>
                  <SelectItem value="4x per week">4x per week</SelectItem>
                  <SelectItem value="5x per week">5x per week</SelectItem>
                  <SelectItem value="Daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4 weeks">4 weeks</SelectItem>
                  <SelectItem value="8 weeks">8 weeks</SelectItem>
                  <SelectItem value="12 weeks">12 weeks</SelectItem>
                  <SelectItem value="6 months">6 months</SelectItem>
                  <SelectItem value="1 year">1 year</SelectItem>
                  <SelectItem value="Ongoing">Ongoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="recommendation">Detailed Recommendation</Label>
            <Textarea
              id="recommendation"
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="Provide specific therapy goals, techniques, and expected outcomes..."
              rows={6}
              required
            />
          </div>

          {error && (
            <div className="text-destructive text-sm">{error}</div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !recommendation.trim() || !therapyType}>
              {loading ? 'Adding Recommendation...' : 'Add Therapy Recommendation'}
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
