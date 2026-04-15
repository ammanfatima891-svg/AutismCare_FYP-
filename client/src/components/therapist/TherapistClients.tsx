import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { toast } from "sonner";

export function TherapistClients() {
  const navigate = useNavigate();

  const clients = [
    {
      id: 1,
      name: "Rabia Babar",
      age: 4,
      therapyType: "Speech Therapy",
      progress: 75,
      sessionsCompleted: 12,
      totalSessions: 15,
    },
    {
      id: 2,
      name: "Amman Fatima",
      age: 3,
      therapyType: "Occupational Therapy",
      progress: 60,
      sessionsCompleted: 8,
      totalSessions: 12,
    },
  ];

  // ---------------- ACTIVITY TEMPLATES ----------------
  const activityTemplates = [
    // Speech Therapy
    {
      id: "s1",
      therapyType: "Speech Therapy",
      title: "Eye Contact Practice",
      description: "Maintain eye contact for 10 seconds",
      duration: "10 min",
    },
    {
      id: "s2",
      therapyType: "Speech Therapy",
      title: "Name Response Training",
      description: "Respond when name is called",
      duration: "15 min",
    },
    {
      id: "s3",
      therapyType: "Speech Therapy",
      title: "Pronunciation Drills",
      description: "Repeat words after therapist",
      duration: "15 min",
    },

    // Occupational Therapy
    {
      id: "o1",
      therapyType: "Occupational Therapy",
      title: "Color Matching",
      description: "Match same color cards",
      duration: "20 min",
    },
    {
      id: "o2",
      therapyType: "Occupational Therapy",
      title: "Hand Coordination",
      description: "Stack blocks or beads",
      duration: "15 min",
    },
    {
      id: "o3",
      therapyType: "Occupational Therapy",
      title: "Sensory Play",
      description: "Use textures and shapes to stimulate senses",
      duration: "20 min",
    },
  ];

  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [assignedActivities, setAssignedActivities] = useState<any[]>([]);

  // ---------------- ASSIGN ACTIVITY ----------------
  const handleAssignActivity = (activity: any) => {
    const alreadyAssigned = assignedActivities.find(
      (a) =>
        a.activityId === activity.id &&
        a.clientId === selectedClient.id
    );

    if (alreadyAssigned) {
      toast.warning("Activity already assigned");
      return;
    }

    setAssignedActivities((prev) => [
      ...prev,
      {
        clientId: selectedClient.id,
        activityId: activity.id,
        title: activity.title,
        assignedAt: new Date(),
      },
    ]);

    toast.success("Activity assigned successfully");
    setShowModal(false);
  };

  // ---------------- FILTER ACTIVITIES BY CLIENT THERAPY ----------------
  const clientActivities = selectedClient
    ? activityTemplates.filter(
        (a) => a.therapyType === selectedClient.therapyType
      )
    : [];

  return (
    <motion.div
      className="max-w-7xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-primary text-xl font-semibold">
        My Clients
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clients.map((client) => (
          <Card key={client.id} className="hover:shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{client.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {client.age} years • {client.therapyType}
                  </p>
                </div>
                <Badge className="bg-primary">Active</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>
                    {client.sessionsCompleted}/{client.totalSessions}
                  </span>
                </div>
                <Progress value={client.progress} />
              </div>

              {/* Assigned Activities */}
              {assignedActivities.filter(
                (a) => a.clientId === client.id
              ).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Assigned Activities
                  </p>

                  {assignedActivities
                    .filter((a) => a.clientId === client.id)
                    .map((activity, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center border rounded-md p-2"
                      >
                        <span className="text-sm">{activity.title}</span>
                        <Badge className="bg-primary/200">Assigned</Badge>
                      </div>
                    ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-primary"
                  onClick={() =>
                    navigate(`/therapist/clients/${client.id}`)
                  }
                >
                  View Profile
                </Button>

                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedClient(client);
                    setShowModal(true);
                  }}
                >
                  Assign Activity
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ---------------- ASSIGN MODAL ---------------- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px]">
            <CardHeader>
              <CardTitle>
                Assign Activity to {selectedClient?.name} (
                {selectedClient?.therapyType})
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {clientActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="border rounded-md p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Duration: {activity.duration}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleAssignActivity(activity)}
                  >
                    Assign
                  </Button>
                </div>
              ))}

              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
