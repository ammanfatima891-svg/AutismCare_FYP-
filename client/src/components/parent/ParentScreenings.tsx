import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
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

function formatChildDisplayName(name: string): string {
  if (!name || typeof name !== 'string') return '—';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
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
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Total Screenings</h1>
          <p className="text-sm text-muted-foreground">All screening records for your children</p>
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
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <p className="text-yellow-800 font-medium">Screening data unavailable offline.</p>
            <p className="text-sm text-yellow-700 mt-1">Connect to the internet to view screenings.</p>
          </CardContent>
        </Card>
      ) : screenings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-muted-foreground font-medium">No screenings yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Screenings for your children will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-8 md:gap-y-6"
          style={{ rowGap: '1.5rem', columnGap: 'clamp(1rem, 3vw, 2rem)' }}
        >
          {screenings.map((s, i) => (
            <motion.div
              key={s._id}
              className="min-w-0"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="group flex h-full min-h-0 flex-col overflow-hidden border border-border/80 shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
                <CardHeader className="space-y-1 border-b border-border/60 bg-muted/30 px-6 pb-4 pt-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Child</p>
                  <p className="text-lg font-semibold leading-tight text-foreground">
                    {formatChildDisplayName(s.childName)}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4 px-6 py-5">
                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-1">
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs font-medium text-muted-foreground">Type</dt>
                      <dd className="font-medium text-foreground">{s.screeningType}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs font-medium text-muted-foreground">Date</dt>
                      <dd className="text-foreground">
                        {new Date(s.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs font-medium text-muted-foreground">Status</dt>
                      <dd>
                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {s.status}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </CardContent>
                <CardFooter className="mt-auto grid w-full grid-cols-1 gap-3 border-t border-border/60 bg-muted/20 px-6 py-5 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10 w-full border-primary/30 px-4 text-primary hover:bg-primary/10"
                    onClick={() => handleViewReport(s._id)}
                    disabled={viewingId === s._id}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {viewingId === s._id ? 'Opening…' : 'View Report'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="min-h-10 w-full px-4"
                    onClick={() => handleDownloadReport(s._id)}
                    disabled={downloadingId === s._id}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloadingId === s._id ? 'Downloading…' : 'Download Report'}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-center text-sm text-yellow-600" role="alert">
          {error}. {isOffline ? 'Showing cached data.' : 'Showing cached data if available.'}
        </p>
      )}
    </div>
  );
}
