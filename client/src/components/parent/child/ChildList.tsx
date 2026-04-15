import { Baby, Calendar, ClipboardCheck, Eye, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { useEffect, useState } from 'react';
import { childAPI } from '../../../api';
import { getAgeDisplayString } from '../../../utils/ageUtils';
import { motion } from 'framer-motion';

interface ChildListProps {
  onViewChild: (childId: number) => void;
  onEditChild: (childId: number) => void;
  /** Opens screening questionnaires (parent dashboard section). */
  onQuickScreen?: () => void;
}

export function ChildList({ onViewChild, onEditChild, onQuickScreen }: ChildListProps) {
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
        <motion.div
          key={child.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card
            className="group cursor-pointer border-2 border-border bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-xl"
            onClick={() => onViewChild(child.id)}
          >
            <CardHeader className="ds-card-header-strip border-0 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <motion.div
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    {child.firstName[0]}
                  </motion.div>
                  <div>
                    <CardTitle className="text-primary group-hover:text-primary transition-colors">
                      {child.firstName} {child.lastName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getAgeDisplayString(child.dateOfBirth)} • {child.gender}
                    </p>
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-primary hover:text-primary hover:bg-muted transition-all duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewChild(child.id);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Profile
                  </Button>
                </motion.div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Primary actions — always visible (hover-only hid these on touch / no-hover). */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 min-w-[7rem] text-xs font-medium shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickScreen?.();
                  }}
                >
                  <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
                  Quick screen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-[7rem] text-xs font-medium border-primary/25 hover:bg-primary/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditChild(child.id);
                  }}
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  Edit profile
                </Button>
              </div>

              <motion.div
                className="flex items-center gap-3 text-sm p-3 rounded-lg bg-muted/80 border border-border/60"
                whileHover={{ x: 2 }}
              >
                <Calendar className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Born:</span>
                <span className="text-foreground font-medium">{new Date(child.dateOfBirth).toLocaleDateString()}</span>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Empty State */}
      {children.length === 0 && (
        <div className="col-span-2 text-center py-12">
          <Baby className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-muted-foreground mb-2">No children added yet</h3>
          <p className="text-muted-foreground">Click the "Add Child" button to create your first child profile</p>
        </div>
      )}
    </div>
  );
}
