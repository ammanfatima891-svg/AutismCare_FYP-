import { useState } from 'react';
import { Home, ClipboardList, FileText, FlaskConical } from 'lucide-react';
import { DashboardLayout } from '../layout/DashboardLayout';
import { LabTestRequests } from './LabTestRequests';
import { LabTestRequestDetail } from './LabTestRequestDetail';
import { LabReports } from './LabReports';
import { LabRequestsBoard } from './LabRequestsBoard';
import { LabMyTests } from './LabMyTests';

type Section = 'home' | 'requests' | 'request-detail' | 'reports' | 'my-tests';

interface LabDashboardProps {
    user?: any;
    onLogout?: () => void;
    initialSection?: Section;
}

const navigation = [
    { id: 'home', label: 'Lab Workflow', icon: Home, color: 'text-primary' },
    { id: 'my-tests', label: 'My Tests', icon: FlaskConical, color: 'text-primary' },
    { id: 'requests', label: 'Legacy Requests', icon: ClipboardList, color: 'text-primary' },
    { id: 'reports', label: 'Reports', icon: FileText, color: 'text-primary' },
];

export function LabDashboard({ user: _user, onLogout, initialSection = 'home' }: LabDashboardProps) {
    const [currentSection, setCurrentSection] = useState<Section>(initialSection);
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

    const renderSection = () => {
        switch (currentSection) {
            case 'home':
                return <LabRequestsBoard />;
            case 'my-tests':
                return <LabMyTests />;
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
                return <LabRequestsBoard />;
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
