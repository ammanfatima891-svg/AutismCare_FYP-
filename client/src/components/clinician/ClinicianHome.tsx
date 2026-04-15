import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ClipboardList, Calendar, MessageSquare, TrendingUp, AlertCircle, Briefcase } from 'lucide-react';

interface ClinicianHomeProps {
  onNavigate: (
    section: 'home' | 'screenings' | 'cases' | 'lab-reports' | 'appointments' | 'messages'
  ) => void;
}

export function ClinicianHome({ onNavigate }: ClinicianHomeProps) {
  const stats: any[] = [];

  const recentActivities: any[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Clinician Dashboard</h2>
        <p className="text-muted-foreground">Welcome back! Here's your overview for today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="p-2 rounded-full bg-accent/20">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Activities
            </CardTitle>
            <CardDescription>Latest patient activities and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    {activity.urgent && <AlertCircle className="h-4 w-4 text-destructive" />}
                    <div>
                      <p className="font-medium text-foreground">{activity.patient}</p>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {activity.time}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => onNavigate('screenings')}
              >
                <ClipboardList className="h-6 w-6 text-primary" />
                <span className="text-sm">Review Screenings</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => onNavigate('appointments')}
              >
                <Calendar className="h-6 w-6 text-primary" />
                <span className="text-sm">Manage Appointments</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => onNavigate('cases')}
              >
                <Briefcase className="h-6 w-6 text-primary" />
                <span className="text-sm">Child Cases</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => onNavigate('messages')}
              >
                <MessageSquare className="h-6 w-6 text-accent" />
                <span className="text-sm">Check Messages</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
