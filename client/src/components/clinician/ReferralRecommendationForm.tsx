import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import API from '../../api';

interface ReferralRecommendationFormProps {
  childId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReferralRecommendationForm({ childId, onSuccess, onCancel }: ReferralRecommendationFormProps) {
  const [recommendation, setRecommendation] = useState('');
  const [referralType, setReferralType] = useState('');
  const [specialist, setSpecialist] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendation.trim() || !referralType) return;

    setLoading(true);
    setError('');

    try {
      await API.post(`/appointment/therapist/recommendation`, {
        childId,
        recommendation: recommendation.trim()
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add referral recommendation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add Referral Recommendation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="referralType">Referral Type</Label>
            <Select value={referralType} onValueChange={setReferralType}>
              <SelectTrigger>
                <SelectValue placeholder="Select referral type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="speech-therapy">Speech Therapy</SelectItem>
                <SelectItem value="occupational-therapy">Occupational Therapy</SelectItem>
                <SelectItem value="physical-therapy">Physical Therapy</SelectItem>
                <SelectItem value="behavioral-therapy">Behavioral Therapy</SelectItem>
                <SelectItem value="developmental-specialist">Developmental Specialist</SelectItem>
                <SelectItem value="neurological-evaluation">Neurological Evaluation</SelectItem>
                <SelectItem value="psychiatric-evaluation">Psychiatric Evaluation</SelectItem>
                <SelectItem value="educational-assessment">Educational Assessment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="specialist">Recommended Specialist (Optional)</Label>
            <Input
              id="specialist"
              value={specialist}
              onChange={(e) => setSpecialist(e.target.value)}
              placeholder="Specific specialist or clinic name"
            />
          </div>

          <div>
            <Label htmlFor="urgency">Urgency Level</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Can wait 3-6 months</SelectItem>
                <SelectItem value="normal">Normal - Within 1-3 months</SelectItem>
                <SelectItem value="high">High - Within 1 month</SelectItem>
                <SelectItem value="urgent">Urgent - Immediate attention needed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="recommendation">Recommendation Details</Label>
            <Textarea
              id="recommendation"
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="Provide detailed reasoning for this referral recommendation..."
              rows={6}
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !recommendation.trim() || !referralType}>
              {loading ? 'Adding Recommendation...' : 'Add Referral Recommendation'}
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
