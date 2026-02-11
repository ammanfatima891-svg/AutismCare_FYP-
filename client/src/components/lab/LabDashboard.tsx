import { useState } from 'react';
import { Home, ClipboardList, Upload, Bell } from 'lucide-react';
import { DashboardLayout } from '../layout/DashboardLayout';
import { LabHome } from './LabHome';
import { TestOrderManagement } from './TestOrderManagement';
import { LabReportUpload } from './LabReportUpload';
import { LabNotifications } from './LabNotifications';

type Section = 'home' | 'orders' | 'upload' | 'notifications';

interface LabDashboardProps {
    user?: any;
    onLogout?: () => void;
}

const navigation = [
    { id: 'home', label: 'Dashboard', icon: Home, color: 'text-cyan-600' },
    { id: 'orders', label: 'Test Orders', icon: ClipboardList, color: 'text-blue-600' },
    { id: 'upload', label: 'Upload Reports', icon: Upload, color: 'text-green-600' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-orange-600' },
];

export function LabDashboard({ user, onLogout }: LabDashboardProps) {
    const [currentSection, setCurrentSection] = useState<Section>('home');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    const handleSectionChange = (section: Section) => {
        setCurrentSection(section);
    };

    const handleNavigate = (section: string, orderId?: string) => {
        setCurrentSection(section as Section);
        if (orderId) {
            setSelectedOrderId(orderId);
        }
    };

    const renderSection = () => {
        switch (currentSection) {
            case 'home':
                return <LabHome onNavigate={handleNavigate} />;
            case 'orders':
                return <TestOrderManagement onNavigate={handleNavigate} />;
            case 'upload':
                return <LabReportUpload selectedOrderId={selectedOrderId} onNavigate={handleNavigate} />;
            case 'notifications':
                return <LabNotifications />;
            default:
                return <LabHome onNavigate={handleNavigate} />;
        }
    };

    return (
        <DashboardLayout
            navigation={navigation}
            currentSection={currentSection}
            onSectionChange={(section: string) => setCurrentSection(section as Section)}
            onLogout={onLogout}
            title="Lab Dashboard"
        >
            {renderSection()}
        </DashboardLayout>
    );
}
