import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, BookOpen } from 'lucide-react';

export function ContentLibrary() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-purple-600 mb-2">Content Library Management</h2>
          <p className="text-gray-600">Manage educational videos, articles, and PECS images</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Upload Content
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            Educational Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Content library management interface - Upload and organize educational materials</p>
        </CardContent>
      </Card>
    </div>
  );
}
