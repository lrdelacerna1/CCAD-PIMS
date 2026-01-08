import React, { useState } from 'react';
import { Area, User } from '../../types';
import { createAreaApi, updateAreaApi, deleteAreaApi } from '../../../backend/api/areas';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface AreaManagementProps {
    areas: Area[];
    users: User[];
    refreshData: () => void;
}

const AreaManagement: React.FC<AreaManagementProps> = ({ areas, users, refreshData }) => {
    const [newAreaName, setNewAreaName] = useState('');
    const [editingArea, setEditingArea] = useState<Area | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // State for the confirmation modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);
    const [assignedAdmins, setAssignedAdmins] = useState<User[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);


    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAreaName.trim()) return;

        setIsLoading(true);
        setError('');
        try {
            if (editingArea) {
                await updateAreaApi(editingArea.id, newAreaName.trim());
            } else {
                await createAreaApi(newAreaName.trim());
            }
            setNewAreaName('');
            setEditingArea(null);
            refreshData();
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (area: Area) => {
        setEditingArea(area);
        setNewAreaName(area.name);
        setError('');
    };

    const handleCancelEdit = () => {
        setEditingArea(null);
        setNewAreaName('');
        setError('');
    };

    const promptForDelete = (area: Area) => {
        const adminsInArea = users.filter(user => user.role === 'admin' && user.managedAreaIds?.includes(area.id));
        setAssignedAdmins(adminsInArea);
        setAreaToDelete(area);
        setShowConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!areaToDelete) return;

        setIsDeleting(true);
        try {
            await deleteAreaApi(areaToDelete.id);
            setShowConfirmModal(false);
            setAreaToDelete(null);
            refreshData();
        } catch (err) {
            setError('Failed to delete area.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm flex flex-col h-full overflow-hidden border dark:border-slate-700">
                <div className="p-6 border-b dark:border-slate-700">
                    <h2 className="text-xl font-semibold dark:text-white mb-4">Area Management</h2>
                    {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                    <form onSubmit={handleCreateOrUpdate} className="flex flex-col sm:flex-row gap-2 mb-4 sm:items-end">
                        <div className="flex-grow">
                            <Input
                                label={editingArea ? 'Edit Area Name' : 'New Area Name'}
                                id="newArea"
                                value={newAreaName}
                                onChange={(e) => setNewAreaName(e.target.value)}
                                placeholder="e.g., West Wing"
                                required
                            />
                        </div>
                        <Button type="submit" isLoading={isLoading} className="w-full sm:!w-auto">
                            {editingArea ? 'Update' : 'Add'}
                        </Button>
                        {editingArea && (
                            <Button type="button" onClick={handleCancelEdit} variant="secondary" className="w-full sm:!w-auto">
                                Cancel
                            </Button>
                        )}
                    </form>
                </div>
                <div className="p-6 space-y-2 flex-grow overflow-y-auto">
                    {areas.map((area) => (
                        <div key={area.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-100 dark:bg-gray-700 p-3 rounded-md gap-2">
                            <span className="text-gray-800 dark:text-gray-200">{area.name}</span>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button onClick={() => handleEdit(area)} className="w-full sm:!w-auto !px-3 !py-1 text-xs">
                                    Edit
                                </Button>
                                <Button onClick={() => promptForDelete(area)} variant="danger" className="w-full sm:!w-auto !px-3 !py-1 text-xs">
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))}
                    {areas.length === 0 && <p className="text-gray-500 dark:text-gray-400">No areas have been created yet.</p>}
                </div>
            </div>

            {/* Deletion Confirmation Modal */}
            {showConfirmModal && areaToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Are you sure you want to delete the area <span className="font-semibold">{areaToDelete.name}</span>?
                            This action cannot be undone.
                        </p>

                        <div className="mt-4">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                The following admins are currently assigned to this area and will be unassigned:
                            </p>
                            {assignedAdmins.length > 0 ? (
                                <ul className="list-disc list-inside mt-2 text-sm text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto">
                                    {assignedAdmins.map(admin => (
                                        <li key={admin.id}>{admin.firstName} {admin.lastName} ({admin.email})</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No admins are assigned to this area.</p>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Button onClick={() => setShowConfirmModal(false)} variant="secondary" className="!w-auto">
                                Cancel
                            </Button>
                            <Button onClick={confirmDelete} isLoading={isDeleting} variant="danger" className="!w-auto">
                                Confirm Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AreaManagement;