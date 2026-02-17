import React from 'react';
import { Button } from '../ui/Button';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: 'student' | 'faculty') => void;
}

const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ isOpen, onClose, onSelectRole }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      {/* Mobile: bottom sheet, Desktop: centered modal */}
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl
                      w-full sm:max-w-md
                      px-6 pt-4 pb-8 sm:p-8
                      animate-slide-up sm:animate-none">

        {/* Drag handle (mobile only) */}
        <div className="flex justify-center mb-4 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4 text-center text-slate-900 dark:text-white">
          Select Your Role
        </h2>
        <p className="mb-6 text-center text-sm sm:text-base text-slate-600 dark:text-slate-300">
          Are you a student or a faculty member?
        </p>

        <div className="flex flex-col sm:flex-row justify-around gap-3 sm:gap-4">
          <Button className="w-full sm:w-auto" onClick={() => onSelectRole('student')}>
            Student
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => onSelectRole('faculty')}>
            Faculty
          </Button>
        </div>

        <div className="mt-6 sm:mt-8 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:underline dark:text-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionModal;