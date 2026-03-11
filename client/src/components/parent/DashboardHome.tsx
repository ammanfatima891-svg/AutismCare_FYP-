import { useState, useEffect, useContext } from 'react';
import {
  Card,
  CardContent,
} from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { childAPI, screeningAPI } from '../../api';
import { AuthContext } from '../../context/AuthContext';
import { motion } from 'framer-motion';

const DASHBOARD_CACHE_KEY = 'parent_dashboard_cache';

interface CachedDashboardData {
  childrenCount: number;
  totalScreenings: number;
  thisMonth: number;
  lastFetched: number;
}

function getCachedData(): CachedDashboardData | null {
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedDashboardData;
    if (typeof parsed.childrenCount !== 'number' || typeof parsed.totalScreenings !== 'number' || typeof parsed.thisMonth !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setCachedData(data: CachedDashboardData): void {
  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
      ...data,
      lastFetched: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

interface DashboardHomeProps {
  onNavigate: (section: string) => void;
}

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const { user } = useContext(AuthContext);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [screeningStats, setScreeningStats] = useState({ totalScreenings: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (isOffline) {
        const cached = getCachedData();
        if (cached) {
          setChildrenCount(cached.childrenCount);
          setScreeningStats({ totalScreenings: cached.totalScreenings, thisMonth: cached.thisMonth });
        }
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const [childrenResponse, screeningStatsResponse] = await Promise.all([
          childAPI.getChildren(),
          screeningAPI.getScreeningStats()
        ]);

        const childrenData = childrenResponse.data?.data || [];
        const count = Array.isArray(childrenData) ? childrenData.length : 0;
        const stats = screeningStatsResponse.data?.data || { totalScreenings: 0, thisMonth: 0 };

        setChildrenCount(count);
        setScreeningStats({
          totalScreenings: stats.totalScreenings ?? 0,
          thisMonth: stats.thisMonth ?? 0,
        });

        setCachedData({
          childrenCount: count,
          totalScreenings: stats.totalScreenings ?? 0,
          thisMonth: stats.thisMonth ?? 0,
          lastFetched: Date.now(),
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
        const cached = getCachedData();
        if (cached) {
          setChildrenCount(cached.childrenCount);
          setScreeningStats({ totalScreenings: cached.totalScreenings, thisMonth: cached.thisMonth });
        } else {
          setChildrenCount(0);
          setScreeningStats({ totalScreenings: 0, thisMonth: 0 });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isOffline]);

  const showOfflineFallback = isOffline && !getCachedData();
  const childProfileDisplay = showOfflineFallback ? 'Data unavailable offline' : childrenCount;
  const screeningsMonthDisplay = showOfflineFallback ? 'Data unavailable offline' : screeningStats.thisMonth;
  const totalScreeningsDisplay = showOfflineFallback ? 'Data unavailable offline' : screeningStats.totalScreenings;

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

      {/* Quick Stats - always visible, interactive Child Profile card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {loading ? (
          <>
            <Card className="text-center">
              <CardContent className="p-4">
                <Skeleton className="h-8 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Skeleton className="h-8 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-32 mx-auto" />
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Skeleton className="h-8 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-28 mx-auto" />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card
              className="text-center cursor-pointer hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
              role="button"
              tabIndex={0}
              onClick={() => onNavigate('children')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigate('children');
                }
              }}
            >
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{childProfileDisplay}</div>
                <div className="text-sm text-gray-600">
                  Child{childrenCount !== 1 ? 'ren' : ''} Profile{childrenCount !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{screeningsMonthDisplay}</div>
                <div className="text-sm text-gray-600">Screenings This Month</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{totalScreeningsDisplay}</div>
                <div className="text-sm text-gray-600">Total Screenings</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {error && !loading && (
        <p className="text-center text-sm text-amber-600" role="alert">
          {error}. {isOffline ? 'Using cached data.' : 'Showing cached data if available.'}
        </p>
      )}
    </div>
  );
}

