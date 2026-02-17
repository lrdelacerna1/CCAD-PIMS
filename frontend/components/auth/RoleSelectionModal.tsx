import React from 'react';
import { Button } from '../ui/Button';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: 'student' | 'faculty') => void;
}

const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ isOpen, onClose, onSelectRole }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center dark:text-white">Select Your Role</h2>
        <p className="mb-6 text-center text-slate-600 dark:text-slate-300">Are you a student or a faculty member?</p>
        <div className="flex justify-around gap-4">
          <Button onClick={() => onSelectRole('student')}>
            Student
          </Button>
          <Button onClick={() => onSelectRole('faculty')}>
            Faculty
          </Button>
        </div>
        <div className="mt-8 text-center">
          <button onClick={onClose} className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionModal;