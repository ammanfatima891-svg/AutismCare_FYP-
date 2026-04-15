import { useState, useCallback } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { ChildList } from './child/ChildList';
import { AddChildForm } from './child/AddChildForm';
import { ChildProfile } from './child/ChildProfile';

type View = 'list' | 'add' | 'profile';

interface ChildManagementProps {
  onQuickScreen?: () => void;
}

export function ChildManagement({ onQuickScreen }: ChildManagementProps) {
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [profileOpensInEdit, setProfileOpensInEdit] = useState(false);

  const handleViewChild = (childId: number) => {
    setSelectedChildId(childId);
    setProfileOpensInEdit(false);
    setCurrentView('profile');
  };

  const handleEditChild = (childId: number) => {
    setSelectedChildId(childId);
    setProfileOpensInEdit(true);
    setCurrentView('profile');
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedChildId(null);
    setProfileOpensInEdit(false);
  };

  const consumeProfileEditIntent = useCallback(() => {
    setProfileOpensInEdit(false);
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      {currentView === 'list' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-primary mb-2">My Children</h2>
              <p className="text-muted-foreground">Manage your children's profiles and information</p>
            </div>
            <Button
              onClick={() => setCurrentView('add')}
              className="rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Child
            </Button>
          </div>
          <ChildList
            onViewChild={handleViewChild}
            onEditChild={handleEditChild}
            onQuickScreen={onQuickScreen}
          />
        </div>
      )}

      {currentView === 'add' && (
        <div>
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
          <AddChildForm onSuccess={handleBack} />
        </div>
      )}

      {currentView === 'profile' && selectedChildId && (
        <div>
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
          <ChildProfile
            childId={selectedChildId}
            initialEditFromList={profileOpensInEdit}
            onConsumedInitialEdit={consumeProfileEditIntent}
          />
        </div>
      )}
    </div>
  );
}
