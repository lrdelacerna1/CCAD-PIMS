import React from 'react';
import { User, Area } from '../../types';
import { Button } from '../ui/Button';
import { UserIcon, MailIcon, PhoneIcon, BuildingOfficeIcon, XIcon, CheckCircleIcon, ExclamationTriangleIcon } from '../Icons';

interface AdminDetailsModalProps {
    admin: User;
    areas: Area[];
    onClose: () => void;
}

const AdminDetailsModal: React.FC<AdminDetailsModalProps> = ({ admin, areas, onClose }) => {
    const managedAreaNames = admin.managedAreaIds
        ?.map(id => areas.find(a => a.id === id)?.name)
        .filter(Boolean) || [];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border dark:border-slate-700 transform transition-all" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <UserIcon className="w-6 h-6 text-sky-500"/>
                            {admin.firstName} {admin.lastName}
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 capitalize border border-sky-200 dark:border-sky-800">
                                {admin.role}
                            </span>
                            {admin.isVerified ? (
                                <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                    <CheckCircleIcon className="w-3 h-3 mr-1" /> Verified
                                </span>
                            ) : (
                                <span className="flex items-center text-xs text-amber-600 dark:text-amber-400 font-medium">
                                    <ExclamationTriangleIcon className="w-3 h-3 mr-1" /> Unverified
                                </span>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <XIcon className="w-6 h-6"/>
                    </button>
                </div>

                <div className="p-6">
                    {/* Details Sections */}
                    <div className="space-y-6">
                        {/* Contact Info */}
                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Contact Information</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                                    <MailIcon className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium">{admin.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                                    <PhoneIcon className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium">{admin.contactNumber || 'No contact number provided'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Managed Areas */}
                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <BuildingOfficeIcon className="w-4 h-4" /> Managed Areas
                            </h4>
                            {managedAreaNames.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {managedAreaNames.map((area, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                                            {area}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">No areas assigned.</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <Button onClick={onClose} className="!w-auto" variant="secondary">
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDetailsModal;