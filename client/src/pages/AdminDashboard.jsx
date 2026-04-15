import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Users, Clock, Calendar } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import ApprovalRequests from "../components/admin/ApprovalRequests";
import { AdminAppointments } from "../components/admin/AdminAppointments";

const navigation = [
  {
    id: "approvals",
    label: "Pending Approvals",
    icon: Clock
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: Calendar
  },
  {
    id: "users",
    label: "User Management",
    icon: Users
  }
];

const menuItems = {
  approvals: ApprovalRequests,
  appointments: AdminAppointments,
  users: () => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">User Management</h3>
        <p className="text-muted-foreground text-center">
          User management features coming soon.
        </p>
      </CardContent>
    </Card>
  )
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("approvals");
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  const ActiveComponent = menuItems[activeTab];

  return (
    <DashboardLayout
      navigation={navigation}
      currentSection={activeTab}
      onSectionChange={setActiveTab}
      onLogout={handleLogout}
      title="Admin Dashboard"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary">
          {navigation.find(item => item.id === activeTab)?.label}
        </h2>
        <p className="text-muted-foreground mt-1">
          Manage administrative tasks and approvals
        </p>
      </div>

      {ActiveComponent && <ActiveComponent />}
    </DashboardLayout>
  );
}

