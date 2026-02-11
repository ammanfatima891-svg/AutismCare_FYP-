import { useState, useEffect, useContext } from 'react';
import { useTheme } from 'next-themes';
import {
  Baby,
  ClipboardCheck,
  Calendar,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  UserPlus,
  FileText,
  Sparkles,
  Sun,
  Moon,
  Bell,
  Search,
  Filter,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { childAPI, screeningAPI } from '../../api';
import { getAgeDisplayString } from '../../utils/ageUtils';
import { AuthContext } from '../../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion } from 'framer-motion';

interface DashboardHomeProps {
  onNavigate: (section: string) => void;
}

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const { user } = useContext(AuthContext);
  const { theme, setTheme } = useTheme();
  const [children, setChildren] = useState<any[]>([]);
  const [screeningStats, setScreeningStats] = useState({ totalScreenings: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [childrenResponse, screeningStatsResponse] = await Promise.all([
          childAPI.getChildren(),
          screeningAPI.getScreeningStats()
        ]);

        const childrenData = childrenResponse.data.data || [];

        // Fetch screening status for each child
        const childrenWithStatus = await Promise.all(
          childrenData.map(async (child: any) => {
            try {
              const statusResponse = await childAPI.getChildScreeningStatus(child.id);
              return {
                ...child,
                screeningStatus: statusResponse.data.data
              };
            } catch (error) {
              console.error(`Error fetching screening status for child ${child.id}:`, error);
              return {
                ...child,
                screeningStatus: null
              };
            }
          })
        );

        setChildren(childrenWithStatus);
        setScreeningStats(screeningStatsResponse.data.data || { totalScreenings: 0, thisMonth: 0 });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setChildren([]);
        setScreeningStats({ totalScreenings: 0, thisMonth: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Mock data removed - will be replaced with real appointment and activity data when implemented
  const upcomingAppointments: any[] = [];
  const recentActivities: any[] = [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl"
        >
          👋
        </motion.div>
        <h1 className="text-3xl font-light text-gray-800">
          Welcome back, {user?.firstName || 'Parent'}!
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Let's take care of your child's development together. This is not a diagnosis - just helpful information.
        </p>
      </motion.div>



      {/* Quick Stats (Simplified) */}
      {children.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{children.length}</div>
              <div className="text-sm text-gray-600">Child{children.length > 1 ? 'ren' : ''} Profile{children.length > 1 ? 's' : ''}</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{screeningStats.thisMonth}</div>
              <div className="text-sm text-gray-600">Screenings This Month</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{screeningStats.totalScreenings}</div>
              <div className="text-sm text-gray-600">Total Screenings</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
function setScreeningStats(arg0: { totalScreenings: number; thisMonth: number; }) {
  throw new Error('Function not implemented.');
}

