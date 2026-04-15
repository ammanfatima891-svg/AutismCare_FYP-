import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  BookOpen, 
  Video, 
  FileText, 
  CheckCircle, 
  Clock, 
  Search,
  Play,
  Download,
  Star
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Progress } from '../ui/progress';

export function EducationSection() {
  const [searchQuery, setSearchQuery] = useState('');

  const contentLibrary = [
    {
      id: 1,
      title: 'Understanding Autism Spectrum Disorder',
      type: 'article',
      category: 'Basics',
      duration: '8 min read',
      image: 'https://images.unsplash.com/photo-1629360021730-3d258452c425?w=400&q=80',
      description: 'A comprehensive guide to understanding ASD and its characteristics',
    },
    {
      id: 2,
      title: 'Communication Strategies for Nonverbal Children',
      type: 'video',
      category: 'Communication',
      duration: '12 min',
      image: 'https://images.unsplash.com/photo-1758612898181-d7c92f0e21d5?w=400&q=80',
      description: 'Learn effective ways to communicate with nonverbal children',
    },
    {
      id: 3,
      title: 'PECS: Picture Exchange Communication System',
      type: 'guide',
      category: 'Communication',
      duration: '15 min read',
      image: 'https://images.unsplash.com/photo-1754294437669-9501390c12bb?w=400&q=80',
      description: 'Step-by-step guide to implementing PECS at home',
    },
    {
      id: 4,
      title: 'Sensory Activities for Home',
      type: 'video',
      category: 'Activities',
      duration: '10 min',
      image: 'https://images.unsplash.com/photo-1628435509114-969a718d64e8?w=400&q=80',
      description: 'Simple sensory activities you can do at home',
    },
  ];

  const assignedActivities = [
    {
      id: 1,
      title: 'Daily Routine Visual Schedule',
      assignedBy: 'Dr. Sarah Johnson',
      category: 'Life Skills',
      child: 'Emma',
      completed: 12,
      total: 15,
      dueDate: '2024-11-10',
      instructions: 'Use picture cards to help Emma understand and follow daily routines.',
      status: 'in-progress',
    },
    {
      id: 2,
      title: 'Color Recognition Games',
      assignedBy: 'Alex Martinez',
      category: 'Cognitive',
      child: 'Emma',
      completed: 8,
      total: 10,
      dueDate: '2024-11-08',
      instructions: 'Practice identifying and naming colors using everyday objects.',
      status: 'in-progress',
    },
    {
      id: 3,
      title: 'Social Greetings Practice',
      assignedBy: 'Dr. Emily Chen',
      category: 'Social',
      child: 'Emma',
      completed: 5,
      total: 8,
      dueDate: '2024-11-12',
      instructions: 'Role-play greeting scenarios with family members.',
      status: 'in-progress',
    },
    {
      id: 4,
      title: 'Fine Motor Skills - Beading',
      assignedBy: 'Alex Martinez',
      category: 'Motor Skills',
      child: 'Noah',
      completed: 0,
      total: 5,
      dueDate: '2024-11-15',
      instructions: 'Practice threading large beads onto string to improve fine motor skills.',
      status: 'not-started',
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'article':
        return <FileText className="w-4 h-4" />;
      case 'guide':
        return <BookOpen className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="mb-2 text-foreground">Learning & Activities</h2>
        <p className="text-muted-foreground">
          Educational resources and therapy activities for your child
        </p>
      </div>

      <Tabs defaultValue="library" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="library">Content Library</TabsTrigger>
          <TabsTrigger value="activities">My Activities</TabsTrigger>
        </TabsList>

        {/* Content Library Tab */}
        <TabsContent value="library" className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search articles, videos, guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">All</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/20">Basics</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/20">Communication</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/20">Activities</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/20">Behavior</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/20">Social Skills</Badge>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contentLibrary.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group">
                <div className="relative h-48 overflow-hidden bg-muted">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
                        <Play className="w-8 h-8 text-primary ml-1" />
                      </div>
                    </div>
                  )}
                  <Badge className="absolute top-3 right-3 bg-primary">
                    {item.category}
                  </Badge>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-primary line-clamp-2">{item.title}</CardTitle>
                    {getTypeIcon(item.type)}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {item.duration}
                    </div>
                    <Button size="sm" className="bg-primary hover:bg-blue-700">
                      {item.type === 'video' ? 'Watch' : 'Read'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-primary">Assigned Activities</h3>
            <div className="flex gap-2">
              <Badge variant="outline">All ({assignedActivities.length})</Badge>
              <Badge className="bg-yellow-500">
                In Progress ({assignedActivities.filter(a => a.status === 'in-progress').length})
              </Badge>
            </div>
          </div>

          {assignedActivities.map((activity) => (
            <Card key={activity.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-primary">{activity.title}</CardTitle>
                      <Badge variant="outline">{activity.category}</Badge>
                    </div>
                    <CardDescription className="space-y-1">
                      <p>Assigned by: {activity.assignedBy}</p>
                      <p>For: {activity.child}</p>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge className={activity.status === 'in-progress' ? 'bg-yellow-500' : 'bg-destructive'}>
                      {activity.status === 'in-progress' ? 'In Progress' : 'Not Started'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      Due: {new Date(activity.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-foreground">{activity.instructions}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground">
                      {activity.completed}/{activity.total} completed
                    </span>
                  </div>
                  <Progress value={(activity.completed / activity.total) * 100} className="h-2" />
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 bg-primary hover:bg-blue-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                  <Button variant="outline" className="flex-1">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
