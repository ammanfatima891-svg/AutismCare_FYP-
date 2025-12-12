import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

export function TherapistSessions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Management</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Sessions section - Schedule and manage therapy sessions</p>
      </CardContent>
    </Card>
  );
}
