import { Baby, Calendar, ClipboardCheck, Eye, TrendingUp, Edit, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { useEffect, useState } from 'react';
import { childAPI } from '../../../api';
import { getAgeDisplayString } from '../../../utils/ageUtils';
import { motion } from 'framer-motion';

interface ChildListProps {
  onViewChild: (childId: number) => void;
}



export function ChildList({ onViewChild }: ChildListProps) {
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
            className="hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-pink-400 bg-gradient-to-br from-white to-pink-50/30 group"
            onClick={() => onViewChild(child.id)}
          >
            <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 group-hover:from-pink-100 group-hover:to-purple-100 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <motion.div
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    {child.firstName[0]}
                  </motion.div>
                  <div>
                    <CardTitle className="text-pink-600 group-hover:text-pink-700 transition-colors">
                      {child.firstName} {child.lastName}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
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
                    className="text-pink-600 hover:text-pink-700 hover:bg-pink-100 transition-all duration-200"
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
            <CardContent className="pt-6">
              {/* Date of Birth */}
              <motion.div
                className="flex items-center gap-3 text-sm p-3 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
                whileHover={{ x: 5 }}
              >
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Born:</span>
                <span className="text-gray-900 font-medium">{new Date(child.dateOfBirth).toLocaleDateString()}</span>
              </motion.div>

              {/* Interactive Actions */}
              <motion.div
                className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs border-pink-200 hover:border-pink-300 hover:bg-pink-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Could add quick screening action here
                  }}
                >
                  <ClipboardCheck className="w-3 h-3 mr-1" />
                  Quick Screen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs border-purple-200 hover:border-purple-300 hover:bg-purple-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Could add edit profile action here
                  }}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Empty State */}
      {children.length === 0 && (
        <div className="col-span-2 text-center py-12">
          <Baby className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-600 mb-2">No children added yet</h3>
          <p className="text-gray-500">Click the "Add Child" button to create your first child profile</p>
        </div>
      )}
    </div>
  );
}
