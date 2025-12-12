import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar as CalendarIcon, Clock, MapPin, Video, Plus, Filter } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Calendar } from '../ui/calendar';

export function AppointmentsSection() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [showBooking, setShowBooking] = useState(false);

  const upcomingAppointments = [
    {
      id: 1,
      child: 'Emma Johnson',
      type: 'Speech Therapy',
      provider: 'Dr. Sarah Johnson',
      specialty: 'Speech-Language Pathologist',
      date: '2024-11-05',
      time: '10:00 AM',
      duration: '45 min',
      location: 'AutismCare Center, Building A',
      mode: 'in-person',
      notes: 'Bring communication board',
    },
    {
      id: 2,
      child: 'Emma Johnson',
      type: 'Occupational Therapy',
      provider: 'Alex Martinez',
      specialty: 'Occupational Therapist',
      date: '2024-11-07',
      time: '2:00 PM',
      duration: '60 min',
      location: 'Virtual',
      mode: 'virtual',
      notes: 'Prepare sensory materials',
    },
    {
      id: 3,
      child: 'Noah Johnson',
      type: 'Developmental Assessment',
      provider: 'Dr. Emily Chen',
      specialty: 'Developmental Pediatrician',
      date: '2024-11-10',
      time: '9:30 AM',
      duration: '90 min',
      location: 'AutismCare Center, Building B',
      mode: 'in-person',
      notes: 'Comprehensive evaluation',
    },
  ];

  const pastAppointments = [
    {
      id: 4,
      child: 'Emma Johnson',
      type: 'Follow-up Assessment',
      provider: 'Dr. Emily Chen',
      date: '2024-10-01',
      time: '3:00 PM',
      status: 'completed',
      notes: 'Progress noted in social communication',
    },
    {
      id: 5,
      child: 'Emma Johnson',
      type: 'Speech Therapy',
      provider: 'Dr. Sarah Johnson',
      date: '2024-10-15',
      time: '10:00 AM',
      status: 'completed',
      notes: 'Continued work on articulation',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-orange-600 mb-2">Appointments</h2>
          <p className="text-gray-600">Manage your children's healthcare appointments</p>
        </div>
        <Button 
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          onClick={() => setShowBooking(!showBooking)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Book Appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-orange-600">Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-gray-600">Upcoming</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Completed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">Cancelled</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="upcoming">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingAppointments.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Past ({pastAppointments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4 mt-6">
              {upcomingAppointments.map((appointment) => (
                <Card key={appointment.id} className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-orange-600">{appointment.type}</CardTitle>
                          <Badge className={appointment.mode === 'virtual' ? 'bg-blue-500' : 'bg-green-500'}>
                            {appointment.mode === 'virtual' ? (
                              <><Video className="w-3 h-3 mr-1" /> Virtual</>
                            ) : (
                              <><MapPin className="w-3 h-3 mr-1" /> In-Person</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{appointment.provider}</p>
                        <p className="text-xs text-gray-500">{appointment.specialty}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {new Date(appointment.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {appointment.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Patient</p>
                        <p className="text-gray-900">{appointment.child}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Duration</p>
                        <p className="text-gray-900">{appointment.duration}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">Location</p>
                        <p className="text-gray-900">{appointment.location}</p>
                      </div>
                    </div>

                    {appointment.notes && (
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Notes:</p>
                        <p className="text-sm text-gray-900">{appointment.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1">
                        Reschedule
                      </Button>
                      <Button variant="outline" className="flex-1 text-red-600 hover:bg-red-50">
                        Cancel
                      </Button>
                      {appointment.mode === 'virtual' && (
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                          <Video className="w-4 h-4 mr-2" />
                          Join Call
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="past" className="space-y-4 mt-6">
              {pastAppointments.map((appointment) => (
                <Card key={appointment.id} className="border-l-4 border-l-green-500 opacity-80 hover:opacity-100 transition-opacity">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-green-600">{appointment.type}</CardTitle>
                          <Badge className="bg-green-500">Completed</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{appointment.provider}</p>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <p>{new Date(appointment.date).toLocaleDateString()}</p>
                        <p className="text-xs">{appointment.time}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Session Notes:</p>
                      <p className="text-sm text-gray-900">{appointment.notes}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        View Report
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Book Follow-up
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
