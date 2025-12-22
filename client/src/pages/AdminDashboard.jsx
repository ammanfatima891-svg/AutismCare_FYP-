import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Users, Clock } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import ApprovalRequests from "../components/admin/ApprovalRequests";

const navigation = [
  {
    id: "approvals",
    label: "Pending Approvals",
    icon: Clock,
    color: "text-blue-600"
  },
  {
    id: "users",
    label: "User Management",
    icon: Users,
    color: "text-green-600"
  }
];

const menuItems = {
  approvals: ApprovalRequests,
  users: () => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Users className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
        <p className="text-gray-500 text-center">
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
        <h2 className="text-2xl font-bold text-gray-900">
          {navigation.find(item => item.id === activeTab)?.label}
        </h2>
        <p className="text-gray-600 mt-1">
          Manage administrative tasks and approvals
        </p>
      </div>

      {ActiveComponent && <ActiveComponent />}
    </DashboardLayout>
  );
}
