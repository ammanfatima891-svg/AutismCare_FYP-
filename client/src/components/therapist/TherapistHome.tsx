import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Users,
  Calendar,
  ClipboardCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { therapistAPI } from '../../api';

interface TherapistHomeProps {
  onNavigate: (section: string) => void;
}

type DashboardStats = {
  assignedChildrenCount: number;
  todaysSessionsCount: number;
  pendingProgressUpdates: number;
  unreadMessagesCount: number;
};

const progressData = [
  { month: 'Jan', sessions: 45, completed: 42 },
  { month: 'Feb', sessions: 48, completed: 46 },
  { month: 'Mar', sessions: 52, completed: 50 },
  { month: 'Apr', sessions: 50, completed: 48 },
  { month: 'May', sessions: 55, completed: 53 },
  { month: 'Jun', sessions: 58, completed: 56 },
];

export function TherapistHome({ onNavigate }: TherapistHomeProps) {
  const [stats, setStats] = useState<DashboardStats>({
    assignedChildrenCount: 0,
    todaysSessionsCount: 0,
    pendingProgressUpdates: 0,
    unreadMessagesCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await therapistAPI.getDashboardStats();
        if (!isMounted) return;
        const data = response.data?.data || {};
        setStats({
          assignedChildrenCount: data.assignedChildrenCount ?? 0,
          todaysSessionsCount: data.todaysSessionsCount ?? 0,
          pendingProgressUpdates: data.pendingProgressUpdates ?? 0,
          unreadMessagesCount: data.unreadMessagesCount ?? 0,
        });
      } catch (err) {
        console.error('Error loading therapist dashboard stats:', err);
        if (isMounted) {
          setError('Failed to load dashboard data.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <motion.div
      className="max-w-7xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-purple-600 mb-2">Therapist Dashboard</h2>
        <p className="text-gray-600">Welcome Back! Here&apos;s your therapy overview for today</p>
      </motion.div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Quick Stats */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="text-green-600">Active Clients</span>
                <Users className="w-5 h-5 text-green-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 text-xl font-semibold">
                {loading ? '—' : stats.assignedChildrenCount}
              </p>
              <p className="text-sm text-gray-600">Assigned to you</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="text-orange-600">Today's Sessions</span>
                <Calendar className="w-5 h-5 text-orange-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 text-xl font-semibold">
                {loading ? '—' : stats.todaysSessionsCount}
              </p>
              <p className="text-sm text-gray-600">Scheduled</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="text-blue-600">This Week</span>
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 text-xl font-semibold">
                {loading ? '—' : stats.pendingProgressUpdates}
              </p>
              <p className="text-sm text-gray-600">Pending progress updates</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="text-purple-600">Reports Pending</span>
                <FileText className="w-5 h-5 text-purple-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 text-xl font-semibold">
                {loading ? '—' : stats.unreadMessagesCount}
              </p>
              <p className="text-sm text-gray-600">Unread messages</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 justify-start gap-3 border-2 hover:border-purple-300 hover:bg-purple-50"
            onClick={() => onNavigate('clients')}
          >
            <Users className="w-5 h-5 text-purple-600" />
            <span>View My Clients</span>
            <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 justify-start gap-3 border-2 hover:border-purple-300 hover:bg-purple-50"
            onClick={() => onNavigate('plans')}
          >
            <ClipboardCheck className="w-5 h-5 text-purple-600" />
            <span>Therapy Plans</span>
            <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 justify-start gap-3 border-2 hover:border-purple-300 hover:bg-purple-50"
            onClick={() => onNavigate('sessions')}
          >
            <Calendar className="w-5 h-5 text-purple-600" />
            <span>Today&apos;s Sessions</span>
            <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 justify-start gap-3 border-2 hover:border-purple-300 hover:bg-purple-50"
            onClick={() => onNavigate('progress')}
          >
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span>Progress Tracking</span>
            <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
          </Button>
        </div>
      </motion.div>

      {/* Sessions Overview Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Sessions Overview (Last 6 Months)
            </CardTitle>
            <CardDescription>Completed vs scheduled sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="sessions" name="Scheduled" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
