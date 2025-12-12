import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, ClipboardList } from 'lucide-react';

export function TherapyTemplates() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-green-600 mb-2">Therapy Template Management</h2>
          <p className="text-gray-600">Create and edit default therapy plan templates</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-green-600" />
            Therapy Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Therapy template management interface - Create reusable therapy plans</p>
        </CardContent>
      </Card>
    </div>
  );
}
