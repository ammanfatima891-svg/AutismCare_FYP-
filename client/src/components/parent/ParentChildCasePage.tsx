import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../layout/DashboardLayout';
import { ParentCaseIntegrationPanels } from './ParentCaseIntegrationPanels';
import { getParentNavigationItems } from './parentNavigation';

interface ParentChildCasePageProps {
  onLogout?: () => void;
}

/**
 * Dedicated Child Case view at /parent/case/:caseId — all case-linked panels in one place.
 */
export function ParentChildCasePage({ onLogout }: ParentChildCasePageProps): ReactNode {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const navigation = getParentNavigationItems();

  const handleSectionChange = (section: string) => {
    navigate('/parent-dashboard', { state: { section } });
  };

  return (
    <DashboardLayout
      navigation={navigation}
      currentSection="child-case"
      onSectionChange={handleSectionChange}
      onLogout={onLogout}
    >
      {caseId ? (
        <ParentCaseIntegrationPanels
          forcedCaseId={caseId}
          onCaseIdChange={(id) => navigate(`/parent/case/${id}`, { replace: true })}
        />
      ) : null}
    </DashboardLayout>
  );
}
