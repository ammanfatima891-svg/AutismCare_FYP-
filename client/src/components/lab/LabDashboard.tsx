import { useState } from 'react';
import { Home, ClipboardList, FileText } from 'lucide-react';
import { DashboardLayout } from '../layout/DashboardLayout';
import { LabHome } from './LabHome';
import { LabTestRequests } from './LabTestRequests';
import { LabTestRequestDetail } from './LabTestRequestDetail';
import { LabReports } from './LabReports';

type Section = 'home' | 'requests' | 'request-detail' | 'reports';

interface LabDashboardProps {
    user?: any;
    onLogout?: () => void;
}

const navigation = [
    { id: 'home', label: 'Dashboard', icon: Home, color: 'text-primary' },
    { id: 'requests', label: 'Test Requests', icon: ClipboardList, color: 'text-primary' },
    { id: 'reports', label: 'Reports', icon: FileText, color: 'text-primary' },
];

export function LabDashboard({ user, onLogout }: LabDashboardProps) {
    const [currentSection, setCurrentSection] = useState<Section>('home');
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    const handleSectionChange = (section: string) => {
        setCurrentSection(section as Section);
        if (section !== 'request-detail') {
            setSelectedRequestId(null);
        }
    };

    // Navigate to request detail view
    const handleViewRequest = (requestId: string) => {
        setSelectedRequestId(requestId);
        setCurrentSection('request-detail');
    };

    const handleNavigate = (section: string) => {
        setCurrentSection(section as Section);
    };

    const renderSection = () => {
        switch (currentSection) {
            case 'home':
                return <LabHome onNavigate={handleNavigate} />;
            case 'requests':
                return <LabTestRequests onViewRequest={handleViewRequest} />;
            case 'request-detail':
                return (
                    <LabTestRequestDetail
                        requestId={selectedRequestId}
                        onBack={() => setCurrentSection('requests')}
                    />
                );
            case 'reports':
                return <LabReports />;
            default:
                return <LabHome onNavigate={handleNavigate} />;
        }
    };

    return (
        <DashboardLayout
            navigation={navigation}
            currentSection={currentSection === 'request-detail' ? 'requests' : currentSection}
            onSectionChange={handleSectionChange}
            onLogout={onLogout}
            title="Lab Dashboard"
        >
            {renderSection()}
        </DashboardLayout>
    );
}
