import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

export function LabMessages() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Messages section - Communicate with clinicians</p>
      </CardContent>
    </Card>
  );
}
