import React, { useState, useMemo } from 'react';
import { User, Area } from '../../types';
import { updateUserApi } from '../../../backend/api/auth';
import { updateAreaApi } from '../../../backend/api/areas';
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
        setSelectedAreaIds((admin as any).managedAreaIds || []);
    };

    const handleCancel = () => {
        setEditingAdminId(null);
        setSelectedAreaIds([]);
    };

    const handleSave = async (adminId: string) => {
        setIsLoading(true);
        setError('');
        try {
            // 1. Save managedAreaIds on the user
            await updateUserApi(adminId, { managedAreaIds: selectedAreaIds });

            // 2. Update adminIds on every area:
            //    - Add adminId to selected areas
            //    - Remove adminId from deselected areas
            await Promise.all(
                areas.map(area => {
                    const currentAdminIds: string[] = (area as any).adminIds || [];
                    const isSelected = selectedAreaIds.includes(area.id);
                    const isCurrentlyAssigned = currentAdminIds.includes(adminId);

                    if (isSelected && !isCurrentlyAssigned) {
                        // Add admin to this area
                        return updateAreaApi(area.id, {
                            adminIds: [...currentAdminIds, adminId]
                        } as any);
                    } else if (!isSelected && isCurrentlyAssigned) {
                        // Remove admin from this area
                        return updateAreaApi(area.id, {
                            adminIds: currentAdminIds.filter(id => id !== adminId)
                        } as any);
                    }
                    return Promise.resolve();
                })
            );

            refreshData();
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
        const q = searchQuery.toLowerCase();
        return admins.filter(admin =>
            (admin as any).firstName?.toLowerCase().includes(q) ||
            (admin as any).lastName?.toLowerCase().includes(q) ||
            (admin as any).emailAddress?.toLowerCase().includes(q)
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
                                    onClick={() => { if (editingAdminId !== admin.id) setViewingAdmin(admin); }}
                                >
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                        {(admin as any).firstName} {(admin as any).lastName}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {(admin as any).emailAddress}
                                    </p>
                                </div>
                                {editingAdminId !== admin.id && (
                                    <div onClick={e => e.stopPropagation()}>
                                        <Button onClick={() => handleEdit(admin)} className="w-full sm:!w-auto !px-3 !py-1 text-xs">
                                            Manage Areas
                                        </Button>
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
                                        <p className="text-sm dark:text-gray-400">No areas available. Please create areas first.</p>
                                    )}
                                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                                        <Button onClick={() => handleSave(admin.id)} isLoading={isLoading} className="w-full sm:!w-auto">Save</Button>
                                        <Button onClick={handleCancel} variant="secondary" className="w-full sm:!w-auto">Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="mt-2 cursor-pointer"
                                    onClick={() => { if (editingAdminId !== admin.id) setViewingAdmin(admin); }}
                                >
                                    <p className="text-sm dark:text-gray-300">
                                        <span className="font-medium">Managed Areas:</span>{' '}
                                        {getAreaNames((admin as any).managedAreaIds)}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredAdmins.length === 0 && (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-4">
                            {searchQuery ? 'No admins match your search.' : 'No standard admins found.'}
                        </p>
                    )}
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