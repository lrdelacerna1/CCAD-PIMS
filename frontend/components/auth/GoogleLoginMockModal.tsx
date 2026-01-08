import React from 'react';
import { GoogleIcon, UserIcon } from '../Icons';

interface GoogleAccount {
    email: string;
    name: string;
    avatar?: string;
}

interface GoogleLoginMockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectAccount: (email: string) => void;
}

const GoogleLoginMockModal: React.FC<GoogleLoginMockModalProps> = ({ isOpen, onClose, onSelectAccount }) => {
    if (!isOpen) return null;

    const mockAccounts: GoogleAccount[] = [
        { email: 'student.sample@up.edu.ph', name: 'Sample Student' },
        { email: 'admin.sample@up.edu.ph', name: 'Sample Admin' },
        { email: 'personal.user@gmail.com', name: 'Personal User' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-[400px] rounded-lg shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Branding */}
                <div className="pt-8 pb-4 flex flex-col items-center">
                    <GoogleIcon className="w-10 h-10 mb-4" />
                    <h2 className="text-2xl font-normal text-slate-900 dark:text-white">Choose an account</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">to continue to <span className="font-medium">CCAD PIMS</span></p>
                </div>

                {/* Account List */}
                <div className="mt-4 border-t border-slate-100 dark:border-slate-700">
                    {mockAccounts.map((account) => (
                        <button
                            key={account.email}
                            onClick={() => onSelectAccount(account.email)}
                            className="w-full flex items-center px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700 group"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center mr-3">
                                <UserIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div className="flex flex-col items-start overflow-hidden">
                                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{account.name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{account.email}</span>
                            </div>
                        </button>
                    ))}
                    
                    <button
                        onClick={() => onSelectAccount('new.user@gmail.com')}
                        className="w-full flex items-center px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700"
                    >
                        <div className="w-8 h-8 flex items-center justify-center mr-3">
                             <UserIcon className="w-5 h-5 text-slate-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Use another account</span>
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                    <p>To continue, Google will share your name, email address, language preference, and profile picture with CCAD PIMS. Before using this app, you can review CCAD PIMS’s <span className="text-blue-600 hover:underline cursor-pointer">privacy policy</span> and <span className="text-blue-600 hover:underline cursor-pointer">terms of service</span>.</p>
                </div>
                
                <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                     <span className="text-xs text-slate-400">English (United States)</span>
                     <div className="flex gap-3">
                         <span className="text-xs hover:bg-slate-200 dark:hover:bg-slate-700 px-1 rounded cursor-pointer">Help</span>
                         <span className="text-xs hover:bg-slate-200 dark:hover:bg-slate-700 px-1 rounded cursor-pointer">Privacy</span>
                         <span className="text-xs hover:bg-slate-200 dark:hover:bg-slate-700 px-1 rounded cursor-pointer">Terms</span>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default GoogleLoginMockModal;