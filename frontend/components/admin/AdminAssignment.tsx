import React, { useState, useMemo } from 'react';
import { User, Area } from '../../types';
import { updateUserManagedAreasApi } from '../../../backend/api/auth';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Input } from '../ui/Input';
import { SearchIcon } from '../Icons';
import AdminDetailsModal from './AdminDetailsModal';

interface AdminAssignmentProps {
    admins: User[];
    areas: Area[];
    refreshData: () => void;
}

const AdminAssignment: React.FC<AdminAssignmentProps> = ({ admins, areas, refreshData }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
    const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [viewingAdmin, setViewingAdmin] = useState<User | null>(null);

    const handleEdit = (admin: User) => {
        setEditingAdminId(admin.id);
        setSelectedAreaIds(admin.managedAreaIds || []);
    };
    
    const handleCancel = () => {
        setEditingAdminId(null);
        setSelectedAreaIds([]);
    };

    const handleSave = async (adminId: string) => {
        setIsLoading(true);
        setError('');
        try {
            await updateUserManagedAreasApi(adminId, selectedAreaIds);
            refreshData(); // Refresh all data from parent
            handleCancel();
        } catch (err) {
             setError('Failed to save assignments.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAreaToggle = (areaId: string) => {
        setSelectedAreaIds(prev => 
            prev.includes(areaId)
                ? prev.filter(id => id !== areaId)
                : [...prev, areaId]
        );
    };
    
    const getAreaNames = (ids: string[] = []): string => {
        if (!ids.length) return 'None';
        return ids.map(id => areas.find(a => a.id === id)?.name).filter(Boolean).join(', ');
    };

    const filteredAdmins = useMemo(() => {
        if (!searchQuery) return admins;
        const lowercasedQuery = searchQuery.toLowerCase();
        return admins.filter(admin =>
            admin.firstName.toLowerCase().includes(lowercasedQuery) ||
            admin.lastName.toLowerCase().includes(lowercasedQuery) ||
            admin.email.toLowerCase().includes(lowercasedQuery)
        );
    }, [admins, searchQuery]);

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm flex flex-col h-full overflow-hidden border dark:border-slate-700">
                <div className="p-6 border-b dark:border-slate-700">
                    <h2 className="text-xl font-semibold dark:text-white mb-4">Admin Area Assignments</h2>
                    <Input
                        id="search-admins"
                        placeholder="Search by name or email..."
                        icon={<SearchIcon className="w-5 h-5" />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
                </div>
                <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                    {filteredAdmins.map(admin => (
                        <div key={admin.id} className="p-4 rounded-md bg-slate-100 dark:bg-slate-700">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div 
                                    className="flex-grow cursor-pointer"
                                    onClick={() => { if (editingAdminId !== admin.id) setViewingAdmin(admin) }}
                                >
                                    <p className="font-semibold text-slate-900 dark:text-white">{admin.firstName} {admin.lastName}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{admin.email}</p>
                                </div>
                                {editingAdminId !== admin.id && (
                                    <div onClick={e => e.stopPropagation()}>
                                        <Button onClick={() => handleEdit(admin)} className="w-full sm:!w-auto !px-3 !py-1 text-xs">Manage Areas</Button>
                                    </div>
                                )}
                            </div>

                            {editingAdminId === admin.id ? (
                                <div className="mt-4">
                                    <h4 className="font-medium mb-2 dark:text-white">Assign Areas:</h4>
                                    {areas.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {areas.map(area => (
                                                <Checkbox 
                                                    key={area.id}
                                                    id={`${admin.id}-${area.id}`}
                                                    label={area.name}
                                                    checked={selectedAreaIds.includes(area.id)}
                                                    onChange={() => handleAreaToggle(area.id)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm dark:text-gray-400">No areas available to assign. Please create areas first.</p>
                                    )}
                                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                                        <Button onClick={() => handleSave(admin.id)} isLoading={isLoading} className="w-full sm:!w-auto">Save</Button>
                                        <Button onClick={handleCancel} variant="secondary" className="w-full sm:!w-auto">Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className="mt-2 cursor-pointer"
                                    onClick={() => { if (editingAdminId !== admin.id) setViewingAdmin(admin) }}
                                >
                                    <p className="text-sm dark:text-gray-300">
                                        <span className="font-medium">Managed Areas:</span>{' '}
                                        {getAreaNames(admin.managedAreaIds)}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredAdmins.length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 py-4">{searchQuery ? 'No admins match your search.' : 'No standard admins found.'}</p>}
                </div>
            </div>
            {viewingAdmin && (
                <AdminDetailsModal 
                    admin={viewingAdmin}
                    areas={areas}
                    onClose={() => setViewingAdmin(null)}
                />
            )}
        </>
    );
};

export default AdminAssignment;