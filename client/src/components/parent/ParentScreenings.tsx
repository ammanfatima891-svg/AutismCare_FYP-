import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { FileText, Download, Eye, ClipboardList } from 'lucide-react';
import { parentAPI, screeningAPI } from '../../api';
import { motion } from 'framer-motion';

const PARENT_SCREENINGS_CACHE_KEY = 'parent_screenings_cache';

interface ScreeningItem {
  _id: string;
  childName: string;
  screeningType: string;
  date: string;
  status: string;
  result?: string;
  resultDescription?: string;
  scores?: Record<string, unknown>;
}

function getCachedScreenings(): ScreeningItem[] | null {
  try {
    const raw = localStorage.getItem(PARENT_SCREENINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScreeningItem[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function setCachedScreenings(screenings: ScreeningItem[]): void {
  try {
    localStorage.setItem(PARENT_SCREENINGS_CACHE_KEY, JSON.stringify(screenings));
  } catch {
    // ignore
  }
}

export function ParentScreenings() {
  const [screenings, setScreenings] = useState<ScreeningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

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
    const fetchScreenings = async () => {
      if (isOffline) {
        const cached = getCachedScreenings();
        if (cached) setScreenings(cached);
        setLoading(false);
        return;
      }
      try {
        setError(null);
        const res = await parentAPI.getScreenings();
        const list = res.data?.screenings ?? [];
        setScreenings(list);
        setCachedScreenings(list);
      } catch (err) {
        console.error('Error fetching screenings:', err);
        setError('Failed to load screenings');
        const cached = getCachedScreenings();
        if (cached) setScreenings(cached);
        else setScreenings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchScreenings();
  }, [isOffline]);

  const handleViewReport = async (id: string) => {
    setViewingId(id);
    try {
      const res = await screeningAPI.downloadSubmissionReport(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `AutismCare_Screening_Report_${id}.pdf`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error('View report failed:', e);
    } finally {
      setViewingId(null);
    }
  };

  const handleDownloadReport = async (id: string) => {
    setDownloadingId(id);
    try {
      const res = await screeningAPI.downloadSubmissionReport(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AutismCare_Screening_Report_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setDownloadingId(null);
    }
  };

  const showOfflineMessage = isOffline && !getCachedScreenings()?.length && !screenings.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Total Screenings</h1>
          <p className="text-sm text-gray-600">All screening records for your children</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-28 mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : showOfflineMessage ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-amber-600 mx-auto mb-3" />
            <p className="text-amber-800 font-medium">Screening data unavailable offline.</p>
            <p className="text-sm text-amber-700 mt-1">Connect to the internet to view screenings.</p>
          </CardContent>
        </Card>
      ) : screenings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-600 font-medium">No screenings yet</h3>
            <p className="text-sm text-gray-500 mt-1">Screenings for your children will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {screenings.map((s, i) => (
            <motion.div
              key={s._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow border border-gray-200">
                <CardContent className="p-5">
                  <p className="text-sm text-gray-500 mb-1">Child</p>
                  <p className="font-semibold text-gray-900 mb-3">{s.childName}</p>
                  <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                    <p><span className="text-gray-500">Type:</span> {s.screeningType}</p>
                    <p><span className="text-gray-500">Date:</span> {new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p><span className="text-gray-500">Status:</span> <span className="text-green-600 font-medium">{s.status}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      onClick={() => handleViewReport(s._id)}
                      disabled={viewingId === s._id}
                    >
                      <Eye className="w-4 h-4 mr-1.5" />
                      {viewingId === s._id ? 'Opening…' : 'View Report'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-teal-600 border-teal-200 hover:bg-teal-50"
                      onClick={() => handleDownloadReport(s._id)}
                      disabled={downloadingId === s._id}
                    >
                      <Download className="w-4 h-4 mr-1.5" />
                      {downloadingId === s._id ? 'Downloading…' : 'Download Report'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-center text-sm text-amber-600" role="alert">
          {error}. {isOffline ? 'Showing cached data.' : 'Showing cached data if available.'}
        </p>
      )}
    </div>
  );
}
