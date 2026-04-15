import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Eye,
  ClipboardList,
  Stethoscope,
  Save,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────
interface Session {
  id: number;
  childName: string;
  childAge: number;
  therapyType: 'Speech Therapy' | 'Occupational Therapy' | 'Behavioral Therapy';
  date: string;
  time: string;
  duration: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  parentName: string;
  notes?: SessionNotes;
}

interface SessionNotes {
  activitiesPerformed: string[];
  behaviorEngagement: 'Excellent' | 'Good' | 'Fair' | 'Needs Support';
  therapistObservations: string;
  outcomeNotes: string;
}

// ─── Dummy Data ──────────────────────────────────────────────────
const dummySessions: Session[] = [
  // Upcoming / Scheduled
  {
    id: 1,
    childName: 'Rabia Babar',
    childAge: 4,
    therapyType: 'Speech Therapy',
    date: '2026-02-12',
    time: '10:00 AM',
    duration: '45 min',
    status: 'Scheduled',
    parentName: 'Mrs. Babar',
  },
  {
    id: 2,
    childName: 'Amman Fatima',
    childAge: 3,
    therapyType: 'Occupational Therapy',
    date: '2026-02-12',
    time: '11:30 AM',
    duration: '40 min',
    status: 'Scheduled',
    parentName: 'Mr. Fatima',
  },
  {
    id: 3,
    childName: 'Ahmed Hassan',
    childAge: 2,
    therapyType: 'Behavioral Therapy',
    date: '2026-02-13',
    time: '9:00 AM',
    duration: '50 min',
    status: 'Scheduled',
    parentName: 'Mrs. Hassan',
  },
  {
    id: 4,
    childName: 'Rabia Babar',
    childAge: 4,
    therapyType: 'Speech Therapy',
    date: '2026-02-14',
    time: '10:00 AM',
    duration: '45 min',
    status: 'Scheduled',
    parentName: 'Mrs. Babar',
  },
  // Completed
  {
    id: 5,
    childName: 'Rabia Babar',
    childAge: 4,
    therapyType: 'Speech Therapy',
    date: '2026-02-10',
    time: '10:00 AM',
    duration: '45 min',
    status: 'Completed',
    parentName: 'Mrs. Babar',
    notes: {
      activitiesPerformed: ['Vowel sound repetition', 'Picture-word matching', 'Name response drills'],
      behaviorEngagement: 'Good',
      therapistObservations:
        'Rabia showed improved response to name calling. She maintained eye contact for 8 seconds (up from 5). Slight frustration during vowel repetition but calmed with sensory break.',
      outcomeNotes:
        'Progressing steadily in receptive language. Recommend increasing picture-word sessions to 3x/week. Parent to continue name-calling drills at home.',
    },
  },
  {
    id: 6,
    childName: 'Amman Fatima',
    childAge: 3,
    therapyType: 'Occupational Therapy',
    date: '2026-02-09',
    time: '11:30 AM',
    duration: '40 min',
    status: 'Completed',
    parentName: 'Mr. Fatima',
    notes: {
      activitiesPerformed: ['Bead stringing', 'Playdough manipulation', 'Stacking blocks (tower of 5)'],
      behaviorEngagement: 'Excellent',
      therapistObservations:
        'Amman completed bead stringing with minimal assistance for the first time. Fine motor grip has noticeably improved. She voluntarily engaged in block stacking without prompting.',
      outcomeNotes:
        'Significant fine motor improvement. Moving to next goal: scissor skills introduction. Parent to practice playdough at home daily.',
    },
  },
  {
    id: 7,
    childName: 'Ahmed Hassan',
    childAge: 2,
    therapyType: 'Behavioral Therapy',
    date: '2026-02-08',
    time: '9:00 AM',
    duration: '50 min',
    status: 'Completed',
    parentName: 'Mrs. Hassan',
    notes: {
      activitiesPerformed: ['Turn-taking game', 'Emotion flashcards', 'Joint attention exercise'],
      behaviorEngagement: 'Fair',
      therapistObservations:
        'Ahmed struggled with turn-taking; left the activity twice. Showed interest in emotion flashcards, correctly identifying "happy" and "sad". Joint attention improved with musical cue support.',
      outcomeNotes:
        'Continue turn-taking with visual timer support. Emotion recognition showing early gains. Recommend ABA-style reinforcement for sustained joint attention.',
    },
  },
  // Cancelled
  {
    id: 8,
    childName: 'Amman Fatima',
    childAge: 3,
    therapyType: 'Occupational Therapy',
    date: '2026-02-07',
    time: '11:30 AM',
    duration: '40 min',
    status: 'Cancelled',
    parentName: 'Mr. Fatima',
  },
  {
    id: 9,
    childName: 'Ahmed Hassan',
    childAge: 2,
    therapyType: 'Behavioral Therapy',
    date: '2026-02-05',
    time: '9:00 AM',
    duration: '50 min',
    status: 'Cancelled',
    parentName: 'Mrs. Hassan',
  },
];

const therapyTypeColor: Record<string, string> = {
  'Speech Therapy': 'bg-secondary/60 text-primary border-border',
  'Occupational Therapy': 'bg-secondary/60 text-primary border-border',
  'Behavioral Therapy': 'bg-accent/10 text-accent-foreground border-border',
};

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  Scheduled: { color: 'bg-secondary/40 text-primary border-border', icon: <Calendar className="w-3.5 h-3.5" /> },
  Completed: { color: 'bg-secondary text-primary border-border', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  Cancelled: { color: 'bg-muted text-destructive border', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const engagementColors: Record<string, string> = {
  Excellent: 'bg-secondary/40 text-primary',
  Good: 'bg-secondary text-primary',
  Fair: 'bg-accent/10 text-accent-foreground',
  'Needs Support': 'bg-muted text-destructive',
};

const defaultActivities: Record<string, string[]> = {
  'Speech Therapy': [
    'Vowel sound repetition',
    'Picture-word matching',
    'Name response drills',
    'Storytelling with prompts',
    'Articulation exercises',
    'Receptive language tasks',
  ],
  'Occupational Therapy': [
    'Bead stringing',
    'Playdough manipulation',
    'Block stacking',
    'Scissor skill practice',
    'Sensory bin exploration',
    'Handwriting pre-skills',
  ],
  'Behavioral Therapy': [
    'Turn-taking game',
    'Emotion flashcards',
    'Joint attention exercise',
    'Visual schedule following',
    'Social story reading',
    'Positive reinforcement practice',
  ],
};

// ─── Animation Variants ──────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Component ───────────────────────────────────────────────────
export function TherapistSessions() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Notes form state
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [engagement, setEngagement] = useState<string>('');
  const [observations, setObservations] = useState('');
  const [outcome, setOutcome] = useState('');

  const upcoming = dummySessions.filter((s) => s.status === 'Scheduled');
  const completed = dummySessions.filter((s) => s.status === 'Completed');
  const cancelled = dummySessions.filter((s) => s.status === 'Cancelled');

  const openSession = (session: Session) => {
    setSelectedSession(session);
    if (session.notes) {
      setSelectedActivities(session.notes.activitiesPerformed);
      setEngagement(session.notes.behaviorEngagement);
      setObservations(session.notes.therapistObservations);
      setOutcome(session.notes.outcomeNotes);
    } else {
      setSelectedActivities([]);
      setEngagement('');
      setObservations('');
      setOutcome('');
    }
    setDialogOpen(true);
  };

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  };

  const handleSaveNotes = () => {
    toast.success('Session notes saved successfully');
    setDialogOpen(false);
  };

  // ─── Session Card ────────────────────────────────────────────
  const SessionCard = ({ session }: { session: Session }) => {
    const typeColor = therapyTypeColor[session.therapyType] || '';
    const status = statusConfig[session.status];

    return (
      <motion.div variants={cardVariants} whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-primary" onClick={() => openSession(session)}>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Left: Child Info */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{session.childName}</h4>
                  <p className="text-sm text-muted-foreground">{session.childAge} years old • Parent: {session.parentName}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="outline" className={typeColor}>
                      {session.therapyType}
                    </Badge>
                    <Badge variant="outline" className={status.color}>
                      <span className="flex items-center gap-1">
                        {status.icon}
                        {session.status}
                      </span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Right: Date/Time */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {session.time}
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  {session.duration}
                </span>
              </div>
            </div>

            {/* Completed note preview */}
            {session.notes && (
              <div className="mt-3 pt-3 border-t border">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  Notes recorded — click to view details
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // ─── Empty State ─────────────────────────────────────────────
  const EmptyState = ({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Icon className="w-12 h-12 mb-3" />
      <p className="text-sm">{message}</p>
    </motion.div>
  );

  return (
    <motion.div
      className="max-w-7xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div>
        <h2 className="text-primary text-xl font-semibold flex items-center gap-2">
          <Stethoscope className="w-6 h-6" />
          Therapy Sessions
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Manage your therapy sessions, view schedules, and document clinical notes</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div whileHover={{ scale: 1.03 }}>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/40 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{upcoming.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming Sessions</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }}>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completed.length}</p>
                <p className="text-sm text-muted-foreground">Completed Sessions</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }}>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{cancelled.length}</p>
                <p className="text-sm text-muted-foreground">Cancelled Sessions</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted border">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Completed ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Cancelled ({cancelled.length})
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="upcoming" className="mt-4">
            {upcoming.length === 0 ? (
              <EmptyState icon={Calendar} message="No upcoming sessions scheduled" />
            ) : (
              <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="show">
                {upcoming.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completed.length === 0 ? (
              <EmptyState icon={CheckCircle} message="No completed sessions yet" />
            ) : (
              <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="show">
                {completed.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-4">
            {cancelled.length === 0 ? (
              <EmptyState icon={XCircle} message="No cancelled sessions" />
            ) : (
              <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="show">
                {cancelled.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </motion.div>
            )}
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* ─── Session Detail / Notes Dialog ──────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-primary">
                  <ClipboardList className="w-5 h-5" />
                  Session {selectedSession.status === 'Completed' ? 'Review' : 'Notes'} — {selectedSession.childName}
                </DialogTitle>
              </DialogHeader>

              {/* Session Info Banner */}
              <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
                <div className="flex flex-wrap gap-4">
                  <span className="flex items-center gap-1 text-foreground">
                    <User className="w-4 h-4 text-primary" />
                    {selectedSession.childName}, {selectedSession.childAge} yrs
                  </span>
                  <span className="flex items-center gap-1 text-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    {new Date(selectedSession.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1 text-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    {selectedSession.time} • {selectedSession.duration}
                  </span>
                </div>
                <Badge variant="outline" className={therapyTypeColor[selectedSession.therapyType]}>
                  {selectedSession.therapyType}
                </Badge>
              </div>

              <Separator />

              {/* Activities Performed */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Activities Performed
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(defaultActivities[selectedSession.therapyType] || []).map((activity) => {
                    const isSelected = selectedActivities.includes(activity);
                    return (
                      <button
                        key={activity}
                        onClick={() => toggleActivity(activity)}
                        className={`text-left p-2.5 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? 'bg-muted border text-primary font-medium'
                            : 'bg-card border text-muted-foreground hover:border'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {isSelected ? <CheckCircle className="w-4 h-4 text-primary" /> : <div className="w-4 h-4 rounded-full border-2" />}
                          {activity}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Child Behavior & Engagement */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Child Behavior & Engagement
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['Excellent', 'Good', 'Fair', 'Needs Support'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setEngagement(level)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        engagement === level
                          ? engagementColors[level] + ' border-current shadow-sm'
                          : 'bg-muted text-muted-foreground border hover:bg-muted'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Therapist Observations */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Therapist Observations
                </h4>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Document the child's responses, any notable behaviors, eye contact quality, communication attempts, sensory reactions, and emotional state during the session..."
                  className="w-full min-h-[100px] p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus-visible:ring-ring/50 resize-y"
                />
              </div>

              {/* Session Outcome Summary */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Session Outcome & Recommendations
                </h4>
                <textarea
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Summarize session outcomes, goals met, areas needing attention, and recommendations for parents/next session..."
                  className="w-full min-h-[80px] p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus-visible:ring-ring/50 resize-y"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={handleSaveNotes}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Session Notes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
