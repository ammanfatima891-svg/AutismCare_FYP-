import { Baby, Calendar, ClipboardCheck, Eye, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { useEffect, useState } from 'react';
import { childAPI } from '../../../api';
import { getAgeDisplayString } from '../../../utils/ageUtils';

interface ChildListProps {
  onViewChild: (childId: number) => void;
}



export function ChildList({ onViewChild }: ChildListProps) {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await childAPI.getChildren();
        setChildren(response.data.data || []);
      } catch (error) {
        console.error('Error fetching children:', error);
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading children...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {children.map((child) => (
        <Card
          key={child.id}
          className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-pink-300"
          onClick={() => onViewChild(child.id)}
        >
          <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-2xl">
                  {child.firstName[0]}
                </div>
                <div>
                  <CardTitle className="text-pink-600">{child.firstName} {child.lastName}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {getAgeDisplayString(child.dateOfBirth)} • {child.gender}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-pink-600">
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Date of Birth */}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Born:</span>
              <span className="text-gray-900">{new Date(child.dateOfBirth).toLocaleDateString()}</span>
            </div>

            {/* Screening Status */}
            <div className="flex items-center gap-3 text-sm">
              <ClipboardCheck className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Screening:</span>
              <Badge variant="secondary" className="bg-yellow-500">
                Pending
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Empty State */}
      {children.length === 0 && (
        <div className="col-span-2 text-center py-12">
          <Baby className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-600 mb-2">No children added yet</h3>
          <p className="text-gray-500">Click the "Add Child" button to create your first child profile</p>
        </div>
      )}
    </div>
  );
}
