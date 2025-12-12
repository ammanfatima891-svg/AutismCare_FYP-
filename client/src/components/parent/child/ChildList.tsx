import { Baby, Calendar, ClipboardCheck, Eye, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';

interface ChildListProps {
  onViewChild: (childId: number) => void;
}

const mockChildren = [
  {
    id: 1,
    name: 'Emma Johnson',
    age: 4,
    dateOfBirth: '2020-03-15',
    gender: 'Female',
    lastScreening: '2 weeks ago',
    screeningStatus: 'completed',
    screeningScore: 'Low Risk',
    nextAppointment: '2024-11-05',
    activitiesCompleted: 12,
    totalActivities: 15,
  },
  {
    id: 2,
    name: 'Noah Johnson',
    age: 3,
    dateOfBirth: '2021-07-22',
    gender: 'Male',
    lastScreening: 'Not started',
    screeningStatus: 'pending',
    screeningScore: null,
    nextAppointment: null,
    activitiesCompleted: 0,
    totalActivities: 0,
  },
];

export function ChildList({ onViewChild }: ChildListProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {mockChildren.map((child) => (
        <Card
          key={child.id}
          className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-pink-300"
          onClick={() => onViewChild(child.id)}
        >
          <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-2xl">
                  {child.name[0]}
                </div>
                <div>
                  <CardTitle className="text-pink-600">{child.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {child.age} years old • {child.gender}
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
              <Badge
                variant={child.screeningStatus === 'completed' ? 'default' : 'secondary'}
                className={child.screeningStatus === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}
              >
                {child.screeningStatus === 'completed' ? 'Completed' : 'Pending'}
              </Badge>
              {child.screeningScore && (
                <span className="text-gray-900 ml-auto">{child.screeningScore}</span>
              )}
            </div>

            {/* Activities Progress */}
            {child.totalActivities > 0 && (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-gray-600">Activities Progress</span>
                  </div>
                  <span className="text-gray-900">
                    {child.activitiesCompleted}/{child.totalActivities}
                  </span>
                </div>
                <Progress
                  value={(child.activitiesCompleted / child.totalActivities) * 100}
                  className="h-2"
                />
              </div>
            )}

            {/* Next Appointment */}
            {child.nextAppointment && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-600">Next Appointment</p>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date(child.nextAppointment).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Empty State */}
      {mockChildren.length === 0 && (
        <div className="col-span-2 text-center py-12">
          <Baby className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-600 mb-2">No children added yet</h3>
          <p className="text-gray-500">Click the "Add Child" button to create your first child profile</p>
        </div>
      )}
    </div>
  );
}
