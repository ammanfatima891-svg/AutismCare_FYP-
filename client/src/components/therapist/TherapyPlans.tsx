import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ClipboardList, Plus } from 'lucide-react';

export function TherapyPlans() {
  const templates = [
    {
      id: 1,
      name: 'Speech Development - Level 1',
      category: 'Speech Therapy',
      duration: '12 weeks',
      activities: 15,
      description: 'Foundation speech therapy program for early intervention',
    },
    {
      id: 2,
      name: 'Social Skills Builder',
      category: 'Behavioral Therapy',
      duration: '8 weeks',
      activities: 10,
      description: 'Structured program to develop social interaction skills',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-purple-600 mb-2">Therapy Plans</h2>
          <p className="text-gray-600">Select templates or create custom therapy plans</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Custom Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-purple-600">{template.name}</CardTitle>
                <Badge variant="outline">{template.category}</Badge>
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 text-sm text-gray-600">
                <span>📅 {template.duration}</span>
                <span>📋 {template.activities} activities</span>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
                  Use Template
                </Button>
                <Button variant="outline" className="flex-1">
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
