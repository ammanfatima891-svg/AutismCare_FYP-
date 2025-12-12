import { useState } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { ChildList } from './child/ChildList';
import { AddChildForm } from './child/AddChildForm';
import { ChildProfile } from './child/ChildProfile';

type View = 'list' | 'add' | 'profile';

export function ChildManagement() {
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  const handleViewChild = (childId: number) => {
    setSelectedChildId(childId);
    setCurrentView('profile');
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedChildId(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {currentView === 'list' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-pink-600 mb-2">My Children</h2>
              <p className="text-gray-600">Manage your children's profiles and information</p>
            </div>
            <Button
              onClick={() => setCurrentView('add')}
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Child
            </Button>
          </div>
          <ChildList onViewChild={handleViewChild} />
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
          <ChildProfile childId={selectedChildId} />
        </div>
      )}
    </div>
  );
}
