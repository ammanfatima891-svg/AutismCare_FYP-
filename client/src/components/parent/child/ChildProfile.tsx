import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Edit,
  FileText,
  Pill,
  AlertCircle,
  Phone,
  Activity
} from 'lucide-react';
import { childAPI } from '../../../api';

interface ChildProfileProps {
  childId: string;
}

export function ChildProfile({ childId }: ChildProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChildData = async () => {
      try {
        const childResponse = await childAPI.getChildById(childId);

        setChild(childResponse.data.data);
      } catch (err) {
        setError('Failed to load child data');
        console.error('Error fetching child:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChildData();
  }, [childId]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error || !child) {
    return <div className="flex justify-center items-center h-64 text-red-500">{error || 'Child not found'}</div>;
  }

  const fullName = `${child.firstName} ${child.lastName}`;
  const age = Math.floor((new Date().getTime() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-pink-200">
        <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-3xl">
                {child.firstName[0]}
              </div>
              <div>
                <h2 className="text-pink-600 mb-1">{fullName}</h2>
                <p className="text-gray-600">{age} years old • {child.gender}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Born: {new Date(child.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="text-pink-600 border-pink-600 hover:bg-pink-50"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pink-600">
                  <FileText className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Full Name</span>
                  <span className="text-gray-900">{fullName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Age</span>
                  <span className="text-gray-900">{age} years</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Gender</span>
                  <span className="text-gray-900">{child.gender}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Date of Birth</span>
                  <span className="text-gray-900">
                    {new Date(child.dateOfBirth).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Activity className="w-5 h-5" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="py-2 border-b border-gray-100">
                  <p className="text-gray-600 text-sm mb-1">Medical History</p>
                  <p className="text-gray-900">{child.medicalHistory}</p>
                </div>
                <div className="flex items-center gap-2 py-2 border-b border-gray-100">
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 text-sm">Allergies:</span>
                  <span className="text-gray-900">{child.allergies}</span>
                </div>
                <div className="flex items-center gap-2 py-2">
                  <Pill className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 text-sm">Medications:</span>
                  <span className="text-gray-900">{child.currentMedications}</span>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Phone className="w-5 h-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Contact Name</span>
                  <span className="text-gray-900">{child.emergencyContact}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Phone Number</span>
                  <span className="text-gray-900">{child.emergencyPhone}</span>
                </div>
              </CardContent>
            </Card>


          </div>
        </TabsContent>




      </Tabs>
    </div>
  );
}
