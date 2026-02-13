
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Area, InventoryItemWithQuantity, InventoryInstance, InventoryInstanceCondition, InventoryInstanceStatus, EquipmentRequest, InventoryItem } from '../../types';
import { getInventoryApi, getInstancesByItemIdApi, createInventoryItemApi, createInstanceApi, updateInventoryItemApi, deleteInventoryItemApi, updateInstanceApi, deleteInstanceApi, checkAvailabilityApi } from '../../../backend/api/inventory';
import { getAreasApi } from '../../../backend/api/areas';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { InventoryIcon, ChevronUpIcon, ChevronDownIcon, PlusIcon, EllipsisVerticalIcon, PencilIcon, EyeSlashIcon, EyeIcon, TrashIcon, PhotoIcon, XIcon, SearchIcon, TagIcon } from '../Icons';
import { Textarea } from '../ui/Textarea';
import { getAllEquipmentRequestsApi } from '../../../backend/api/equipmentRequests';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isWithinInterval } from 'date-fns';
import RequestHistory from './RequestHistory';

const StatusBadge: React.FC<{ status: InventoryInstanceStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize";
    const statusClasses: { [key in InventoryInstanceStatus]: string } = {
        'Available': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        'Reserved': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        'Under Maintenance': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const ConditionBadge: React.FC<{ condition: InventoryInstanceCondition }> = ({ condition }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize";
    const conditionClasses: { [key in InventoryInstanceCondition]: string } = {
        'Good': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        'Damaged': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        'Lost/Unusable': 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    };
    return <span className={`${baseClasses} ${conditionClasses[condition]}`}>{condition}</span>;
};

const AddItemModal: React.FC<{
    manageableAreas: Area[];
    onClose: () => void;
    onProceed: (item: InventoryItem) => void;
    initialData?: InventoryItem;
}> = ({ manageableAreas, onClose, onProceed, initialData }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [areaId, setAreaId] = useState(initialData?.areaId || manageableAreas[0]?.id || '');
    const [photoUrl, setPhotoUrl] = useState(initialData?.photoUrl || '');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photoUrl || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoUrl(''); // Clear URL when file is selected
            
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setPhotoUrl(url);
        setPhotoFile(null); // Clear file when URL is entered
        setPhotoPreview(url || null);
    };

    const handleRemovePhoto = () => {
        setPhotoFile(null);
        setPhotoUrl('');
        setPhotoPreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !areaId) {
            setError('Please fill out all fields.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            let finalPhotoUrl = photoUrl.trim();
            
            if (photoFile) {
                const reader = new FileReader();
                finalPhotoUrl = await new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(photoFile);
                });
            }

            let item: InventoryItem;
            if (initialData) {
                item = await updateInventoryItemApi(initialData.id, { 
                    name: name.trim(), 
                    areaId,
                    photoUrl: finalPhotoUrl || undefined
                });
            } else {
                item = await createInventoryItemApi({ 
                    name: name.trim(), 
                    areaId,
                    photoUrl: finalPhotoUrl || undefined
                });
            }
            onProceed(item);
        } catch (err: any) {
            setError(err.message || 'Failed to save item. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <div className="flex justify-between items-center border-b pb-3 mb-4 dark:border-slate-600">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {initialData ? 'Edit Equipment' : 'Add New Equipment'}
                            </h3>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
                        </div>
                        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                        <div className="space-y-4">
                            <Input
                                label="Equipment Name"
                                id="item-name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., HDMI Cable (10ft)"
                                required
                            />
                             <Select
                                label="Area"
                                id="item-area"
                                value={areaId}
                                onChange={e => setAreaId(e.target.value)}
                                options={manageableAreas.map(a => ({ value: a.id, label: a.name }))}
                                required
                            />
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"><PhotoIcon className="w-4 h-4 inline mr-2" />Equipment Photo (Optional)</label>
                                {photoPreview && (
                                    <div className="mb-3 relative">
                                        <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-slate-300 dark:border-slate-600" />
                                        <button type="button" onClick={handleRemovePhoto} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><XIcon className="w-4 h-4" /></button>
                                    </div>
                                )}
                                <div className="mb-2">
                                    <label htmlFor="photo-file" className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-sky-500 dark:hover:border-sky-500 transition-colors">
                                        <PhotoIcon className="w-5 h-5 mr-2 text-slate-500" />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">{photoFile ? photoFile.name : 'Choose a file or drag here'}</span>
                                    </label>
                                    <input type="file" id="photo-file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </div>
                                <div className="relative py-2"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300 dark:border-slate-600"></div></div><div className="relative flex justify-center"><span className="bg-white dark:bg-slate-800 px-2 text-xs text-slate-500">OR</span></div></div>
                                <input type="url" id="item-photo-url" value={photoUrl} onChange={handleUrlChange} placeholder="Enter image URL" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm" />
                            </div>
                        </div>
                    </div>
                    <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                        <Button type="button" onClick={onClose} className="!w-auto" variant="secondary">Cancel</Button>
                        <Button type="submit" isLoading={isLoading} className="!w-auto">{initialData ? 'Save Changes' : 'Proceed'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddInstanceModal: React.FC<{
    item: InventoryItemWithQuantity;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: InventoryInstance;
}> = ({ item, onClose, onSuccess, initialData }) => {
    const [formData, setFormData] = useState({
        serialNumber: initialData?.serialNumber || '',
        condition: initialData?.condition || 'Good' as InventoryInstanceCondition,
        notes: initialData?.notes || '',
        assetTag: initialData?.assetTag || '',
        purchaseDate: initialData?.purchaseDate || '',
        warrantyEndDate: initialData?.warrantyEndDate || '',
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.assetTag.trim()) {
            setError('Asset Tag is required.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const payload: Omit<InventoryInstance, 'id' | 'itemId' | 'status' > = {
                ...formData,
                serialNumber: formData.serialNumber.trim(),
                notes: formData.notes.trim(),
                assetTag: formData.assetTag.trim(),
            };

            if (initialData) {
                await updateInstanceApi(initialData.id, payload as any);
            } else {
                await createInstanceApi({
                    itemId: item.id,
                    status: 'Available', 
                    ...payload,
                    photoUrls: [], // Photos managed in details modal
                });
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to save instance. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-3 mb-4 dark:border-slate-600">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{initialData ? 'Edit Instance' : 'Add Instance'}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{item.name}</p>
                            </div>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
                        </div>
                        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                        <div className="space-y-4">
                             <Input label="Asset Tag" id="assetTag" name="assetTag" value={formData.assetTag} onChange={handleInputChange} required />
                             <Input label="Serial Number (Optional)" id="serialNumber" name="serialNumber" value={formData.serialNumber} onChange={handleInputChange} />
                            <Select label="Condition" id="condition" name="condition" value={formData.condition} onChange={handleInputChange} options={['Good', 'Damaged', 'Lost/Unusable'].map(c => ({ value: c, label: c }))} />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Purchase Date (Optional)" id="purchaseDate" name="purchaseDate" type="date" value={formData.purchaseDate} onChange={handleInputChange} />
                                <Input label="Warranty End Date (Optional)" id="warrantyEndDate" name="warrantyEndDate" type="date" value={formData.warrantyEndDate} onChange={handleInputChange} />
                            </div>
                            <Textarea label="Notes (Optional)" id="notes" name="notes" value={formData.notes} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                        <Button type="button" onClick={onClose} className="!w-auto" variant="secondary">Cancel</Button>
                        <Button type="submit" isLoading={isLoading} className="!w-auto">{initialData ? 'Save Changes' : 'Save Instance'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InstanceDetailsModal: React.FC<{ instance: InventoryInstance; item: InventoryItemWithQuantity; onClose: () => void; onUpdate: () => void; }> = ({ instance, item, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'calendar' | 'history'>('details');
    
    const [editedInstance, setEditedInstance] = useState(instance);
    const [newPhotoUrl, setNewPhotoUrl] = useState('');

    const [currentDate, setCurrentDate] = useState(new Date());
    const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
    const [isCalendarLoading, setIsCalendarLoading] = useState(true);
    const [localBlockedDates, setLocalBlockedDates] = useState<Set<string>>(new Set(instance.blockedDates || []));
    const [isSaving, setIsSaving] = useState(false);

    const hasChanges = useMemo(() => 
        JSON.stringify(instance) !== JSON.stringify(editedInstance) ||
        JSON.stringify(new Set(instance.blockedDates || [])) !== JSON.stringify(localBlockedDates),
    [instance, editedInstance, localBlockedDates]);

    useEffect(() => {
        setEditedInstance(instance);
        setLocalBlockedDates(new Set(instance.blockedDates || []));
    }, [instance]);

    useEffect(() => {
        if (activeTab !== 'calendar') return;
        const fetchReservations = async () => {
            setIsCalendarLoading(true);
            try {
                const allRequests: EquipmentRequest[] = await getAllEquipmentRequestsApi();
                const instanceRequests = allRequests.filter(req => 
                    req.assignedItems?.some(asgn => asgn.instanceId === instance.id) &&
                    ['Approved', 'Ready for Pickup', 'In Use', 'Overdue'].includes(req.status)
                );
                const booked = new Set<string>();
                instanceRequests.forEach(req => {
                    const start = new Date(req.requestedStartDate);
                    const end = new Date(req.requestedEndDate);
                    const interval = eachDayOfInterval({ start, end });
                    interval.forEach(day => booked.add(format(day, 'yyyy-MM-dd')));
                });
                setBookedDates(booked);
            } catch (error) {
                console.error("Failed to fetch reservations for calendar", error);
            } finally {
                setIsCalendarLoading(false);
            }
        };
        fetchReservations();
    }, [instance.id, activeTab]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedInstance(prev => ({ ...prev, [name]: value }));
    };

    const handleAddPhoto = () => {
        if (newPhotoUrl.trim() && !editedInstance.photoUrls?.includes(newPhotoUrl.trim())) {
            setEditedInstance(prev => ({ ...prev, photoUrls: [...(prev.photoUrls || []), newPhotoUrl.trim()] }));
            setNewPhotoUrl('');
        }
    };
    
    const handleRemovePhoto = (urlToRemove: string) => {
        setEditedInstance(prev => ({ ...prev, photoUrls: (prev.photoUrls || []).filter(url => url !== urlToRemove) }));
    };
    
    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const { status, ...payloadToUpdate } = editedInstance;
            await updateInstanceApi(instance.id, { ...payloadToUpdate, blockedDates: Array.from(localBlockedDates) });
            onUpdate();
            onClose();
        } catch (error) {
            console.error("Failed to save changes", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDayClick = (day: Date) => {
        const dayString = format(day, 'yyyy-MM-dd');
        if (bookedDates.has(dayString)) return;
        setLocalBlockedDates(prev => {
            const newBlocked = new Set(prev);
            if (newBlocked.has(dayString)) newBlocked.delete(dayString);
            else newBlocked.add(dayString);
            return newBlocked;
        });
    };
    
    const renderCalendar = () => {
        const monthStart = startOfMonth(currentDate);
        const allDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });
        return allDays.map(day => {
            const dayString = format(day, 'yyyy-MM-dd');
            const isBooked = bookedDates.has(dayString);
            const isBlocked = localBlockedDates.has(dayString);
            let classes = 'h-8 w-8 flex items-center justify-center rounded-full text-xs transition-colors';
            if (!isSameMonth(day, monthStart)) classes += ' text-slate-400 dark:text-slate-500';
            else if (isBooked) classes += ' bg-rose-200 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 font-semibold line-through cursor-not-allowed';
            else if (isBlocked) classes += ' bg-slate-300 dark:bg-slate-800 text-slate-800 dark:text-slate-200 line-through cursor-pointer';
            else classes += ' bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 cursor-pointer';
            if (isToday(day)) classes += ' ring-2 ring-sky-500';
            return <div key={day.toString()} className="flex justify-center items-center py-1" onClick={() => handleDayClick(day)}><div className={classes}><span>{format(day, 'd')}</span></div></div>;
        });
    };
    
    const activeTabClasses = "border-b-2 border-sky-500 text-sky-600 dark:text-sky-500";
    const inactiveTabClasses = "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center border-b pb-3 mb-4 dark:border-slate-600">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{instance.assetTag}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{item.name}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
                    </div>
                    <div className="border-b border-slate-200 dark:border-slate-700 mb-4">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button onClick={() => setActiveTab('details')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? activeTabClasses : inactiveTabClasses}`}>Details</button>
                            <button onClick={() => setActiveTab('photos')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'photos' ? activeTabClasses : inactiveTabClasses}`}>Photos</button>
                            <button onClick={() => setActiveTab('calendar')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'calendar' ? activeTabClasses : inactiveTabClasses}`}>Calendar</button>
                            <button onClick={() => setActiveTab('history')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'history' ? activeTabClasses : inactiveTabClasses}`}>History</button>
                        </nav>
                    </div>
                </div>

                <div className="px-6 pb-6 overflow-y-auto flex-grow">
                    {activeTab === 'details' && (
                        <div className="space-y-4">
                            <Input label="Asset Tag" id="assetTag" name="assetTag" value={editedInstance.assetTag || ''} onChange={handleInputChange} required />
                            <Input label="Serial Number" id="serialNumber" name="serialNumber" value={editedInstance.serialNumber || ''} onChange={handleInputChange} />
                            <Select label="Condition" id="condition" name="condition" value={editedInstance.condition} onChange={handleInputChange} options={['Good', 'Damaged', 'Lost/Unusable'].map(c => ({ value: c, label: c }))} />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Purchase Date" id="purchaseDate" name="purchaseDate" type="date" value={editedInstance.purchaseDate || ''} onChange={handleInputChange} />
                                <Input label="Warranty End Date" id="warrantyEndDate" name="warrantyEndDate" type="date" value={editedInstance.warrantyEndDate || ''} onChange={handleInputChange} />
                            </div>
                            <Textarea label="Notes" id="notes" name="notes" value={editedInstance.notes || ''} onChange={handleInputChange} />
                        </div>
                    )}
                    {activeTab === 'photos' && (
                        <div className="space-y-4">
                            <div className="flex items-end gap-2">
                                <div className="flex-grow"><Input label="Add New Photo URL" id="new-photo-url" value={newPhotoUrl} onChange={e => setNewPhotoUrl(e.target.value)} icon={<PhotoIcon className="w-5 h-5"/>}/></div>
                                <Button type="button" onClick={handleAddPhoto} disabled={!newPhotoUrl.trim()} className="!w-auto">Add</Button>
                            </div>
                            {(editedInstance.photoUrls && editedInstance.photoUrls.length > 0) ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {editedInstance.photoUrls.map(url => (
                                        <div key={url} className="relative group">
                                            <img src={url} alt="Instance" className="rounded-lg w-full h-32 object-cover" />
                                            <button onClick={() => handleRemovePhoto(url)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><XIcon className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-8 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <p className="text-slate-500 dark:text-slate-400">No photos have been added.</p>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'calendar' && (
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Click dates to manually block them for maintenance. Dates with reservations cannot be changed.</p>
                            {isCalendarLoading ? <p className="text-center">Loading calendar...</p> : (
                                <>
                                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-4 text-xs">
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-100 dark:bg-emerald-900/50"/> Available</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-800"/> Blocked</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-200 dark:bg-rose-900/50"/> Reserved</span>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                        <div className="flex items-center justify-between pb-2">
                                            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronUpIcon className="w-5 h-5 transform -rotate-90" /></button>
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">{format(currentDate, 'MMMM yyyy')}</h3>
                                            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronDownIcon className="w-5 h-5 transform -rotate-90" /></button>
                                        </div>
                                        <div className="grid grid-cols-7 mb-2 text-center text-xs text-slate-500 dark:text-slate-400 font-semibold">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}</div>
                                        <div className="grid grid-cols-7">{renderCalendar()}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {activeTab === 'history' && <RequestHistory itemId={item.id} />}
                </div>

                <div className="p-4 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 mt-auto rounded-b-lg">
                    <Button onClick={onClose} className="!w-auto" variant="secondary">Cancel</Button>
                    <Button onClick={handleSaveChanges} isLoading={isSaving} disabled={!hasChanges} className="!w-auto">Save Changes</Button>
                </div>
            </div>
        </div>
    );
};

const AvailabilityCheckModal: React.FC<{
    inventory: InventoryItemWithQuantity[];
    areas: Area[];
    onClose: () => void;
}> = ({ inventory, areas, onClose }) => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState<Map<string, { name: string; areaName: string }>>(new Map());
    const [results, setResults] = useState<Map<string, any>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    useEffect(() => {
        const performCheck = async () => {
            if (selectedItems.size === 0 || !startDate || !endDate || new Date(endDate) < new Date(startDate)) {
                setResults(new Map());
                return;
            }
            setIsLoading(true);
            setError('');
            try {
                const data = await checkAvailabilityApi({ startDate, endDate, itemIds: Array.from(selectedItems.keys()) });
                setResults(new Map(data.map(item => [item.itemId, item])));
            } catch (err) {
                setError('Failed to check availability.');
            } finally {
                setIsLoading(false);
            }
        };
        const handler = setTimeout(performCheck, 500);
        return () => clearTimeout(handler);
    }, [startDate, endDate, selectedItems]);

    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        return inventory.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) && !selectedItems.has(item.id));
    }, [searchQuery, inventory, selectedItems]);

    const handleSelectItem = (item: InventoryItemWithQuantity) => {
        setSelectedItems(prev => {
            const newMap = new Map(prev);
            newMap.set(item.id, { name: item.name, areaName: areas.find(a => a.id === item.areaId)?.name || 'N/A' });
            return newMap;
        });
        setSearchQuery('');
    };

    const handleRemoveItem = (itemId: string) => {
        setSelectedItems(prev => { const newMap = new Map(prev); newMap.delete(itemId); return newMap; });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-slate-600"><h3 className="text-xl font-bold text-slate-900 dark:text-white">Check Instance Availability</h3></div>
                <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Start Date" id="check-start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <Input label="End Date" id="check-end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
                    </div>
                    <div className="relative">
                        <Input label="Search and select an item" id="item-search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} icon={<SearchIcon className="w-5 h-5" />} />
                        {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.map(item => ( <div key={item.id} onClick={() => handleSelectItem(item)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">{item.name} ({areas.find(a => a.id === item.areaId)?.name || 'N/A'})</div> ))}
                            </div>
                        )}
                    </div>
                     <div className="space-y-4">
                        {Array.from(selectedItems.entries()).map(([itemId, itemData]) => {
                            const result = results.get(itemId);
                            return (
                            <Card key={itemId} className="!max-w-none !p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="font-bold text-lg dark:text-white">{itemData.name} ({itemData.areaName})</p>
                                    <button onClick={() => handleRemoveItem(itemId)} className="text-red-500 hover:text-red-700">&times;</button>
                                </div>
                                {isLoading && selectedItems.has(itemId) ? <p className="text-sm dark:text-gray-400">Checking...</p> : result && (
                                    <div>
                                        <h4 className="text-sm font-semibold dark:text-gray-300 mb-2">Available for the entire period:</h4>
                                        {result.availableInstances.length > 0 ? (
                                            <ul className="space-y-1">
                                                {result.availableInstances.map((inst: any) => <li key={inst.id} className="text-sm p-2 bg-green-50 dark:bg-green-900/50 rounded">{inst.assetTag} - {inst.condition}</li>)}
                                            </ul>
                                        ) : <p className="text-sm p-2 bg-red-50 dark:bg-red-900/50 rounded text-red-700 dark:text-red-300">No single instance is available for the full duration.</p>}
                                    </div>
                                )}
                            </Card>
                        )})}
                        {selectedItems.size === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-4">Search for items to check their availability.</p>}
                    </div>
                </div>
                 <div className="p-6 flex justify-end gap-3 border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"><Button onClick={onClose} className="!w-auto" variant="secondary">Close</Button></div>
            </div>
        </div>
    );
};

const InstanceActionMenu: React.FC<{
    instance: InventoryInstance;
    onEdit: (instance: InventoryInstance) => void;
    onDelete: (instance: InventoryInstance) => void;
}> = ({ instance, onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleAction = (action: () => void) => { action(); setIsOpen(false); };
    return (
        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Options"><EllipsisVerticalIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /></button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 z-10 overflow-hidden">
                    <button onClick={() => handleAction(() => onEdit(instance))} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"><PencilIcon className="w-3 h-3" /> Edit</button>
                    <button onClick={() => handleAction(() => onDelete(instance))} className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 border-t dark:border-slate-700"><TrashIcon className="w-3 h-3" /> Delete</button>
                </div>
            )}
        </div>
    );
};

const ItemActionMenu: React.FC<{
    item: InventoryItemWithQuantity;
    onEdit: (item: InventoryItemWithQuantity) => void;
    onHide: (item: InventoryItemWithQuantity) => void;
    onDelete: (item: InventoryItemWithQuantity) => void;
}> = ({ item, onEdit, onHide, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleAction = (action: () => void) => { action(); setIsOpen(false); };
    return (
        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Options"><EllipsisVerticalIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 z-10 overflow-hidden">
                    <button onClick={() => handleAction(() => onEdit(item))} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"><PencilIcon className="w-4 h-4" /> Edit</button>
                    <button onClick={() => handleAction(() => onHide(item))} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">{item.isHidden ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}{item.isHidden ? 'Unhide' : 'Hide'}</button>
                    <button onClick={() => handleAction(() => onDelete(item))} className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 border-t dark:border-slate-700"><TrashIcon className="w-4 h-4" /> Delete</button>
                </div>
            )}
        </div>
    );
};

interface EquipmentManagementProps {
    searchQuery: string;
    areaFilter: string;
}

const EquipmentManagement: React.FC<EquipmentManagementProps> = ({ searchQuery, areaFilter }) => {
    const { user } = useAuth();
    const [inventory, setInventory] = useState<InventoryItemWithQuantity[]>([]);
    const [allEquipmentRequests, setAllEquipmentRequests] = useState<EquipmentRequest[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<InventoryItemWithQuantity | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<InventoryItemWithQuantity | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isAddInstanceModalOpen, setIsAddInstanceModalOpen] = useState(false);
    const [itemForNewInstance, setItemForNewInstance] = useState<InventoryItemWithQuantity | null>(null);
    const [instanceToEdit, setInstanceToEdit] = useState<InventoryInstance | null>(null);
    const [showDeleteInstanceConfirm, setShowDeleteInstanceConfirm] = useState<InventoryInstance | null>(null);
    
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [viewingInstance, setViewingInstance] = useState<InventoryInstance | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [invData, areasData, requestsData] = await Promise.all([
                getInventoryApi(), 
                getAreasApi(),
                getAllEquipmentRequestsApi(),
            ]);
            setInventory(invData);
            setAreas(areasData);
            setAllEquipmentRequests(requestsData);
        } catch (err) {
            setError('Failed to load inventory data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const areasMap = useMemo(() => new Map(areas.map(area => [area.id, area.name])), [areas]);
    const manageableAreas = useMemo(() => user?.role === 'superadmin' ? areas : areas.filter(a => user?.managedAreaIds?.includes(a.id)), [areas, user]);

    const filteredInventory = useMemo(() => {
        let processed = inventory.filter(item => manageableAreas.some(a => a.id === item.areaId));
        if (areaFilter !== 'all') processed = processed.filter(item => item.areaId === areaFilter);
        if (searchQuery.trim() !== '') processed = processed.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return processed;
    }, [inventory, areaFilter, searchQuery, manageableAreas]);

    const visibleInventory = useMemo(() => filteredInventory.filter(item => !item.isHidden), [filteredInventory]);
    const hiddenInventory = useMemo(() => filteredInventory.filter(item => item.isHidden), [filteredInventory]);

    const toggleExpand = (itemId: string) => setExpandedItemId(prevId => (prevId === itemId ? null : itemId));
    const handleViewInstance = (instance: InventoryInstance, parentItem: InventoryItemWithQuantity) => {
        setItemForNewInstance(parentItem);
        setViewingInstance(instance);
    };
    const handleOpenAddInstanceModal = (item: InventoryItemWithQuantity) => {
        setItemForNewInstance(item);
        setInstanceToEdit(null);
        setIsAddInstanceModalOpen(true);
    };

    const handleProceedFromAddItem = (newItem: InventoryItem) => {
        setIsAddItemModalOpen(false);
        setItemToEdit(null); // Clear edit state
        if (itemToEdit) {
            fetchData();
        } else {
            const itemWithQuantity: InventoryItemWithQuantity = { ...newItem, quantity: { total: 0, available: 0, reserved: 0, underMaintenance: 0 } };
            setItemForNewInstance(itemWithQuantity);
            setIsAddInstanceModalOpen(true);
            fetchData(); // fetch in background to update list
        }
    };
    
    const handleEditItem = (item: InventoryItemWithQuantity) => { setItemToEdit(item); setIsAddItemModalOpen(true); };
    const handleToggleHide = async (item: InventoryItemWithQuantity) => {
        try { await updateInventoryItemApi(item.id, { name: item.name, areaId: item.areaId, isHidden: !item.isHidden }); fetchData(); } catch (err) { console.error("Failed to toggle visibility", err); }
    };
    const handleDeleteClick = (item: InventoryItemWithQuantity) => { setShowDeleteConfirm(item); };
    const handleConfirmDelete = async () => {
        if (!showDeleteConfirm) return;
        setIsDeleting(true);
        try { await deleteInventoryItemApi(showDeleteConfirm.id); fetchData(); setShowDeleteConfirm(null); } catch (err) { console.error("Failed to delete item", err); } finally { setIsDeleting(false); }
    };

    const handleEditInstance = (instance: InventoryInstance) => {
        const parent = inventory.find(i => i.id === instance.itemId);
        if (parent) { setItemForNewInstance(parent); setInstanceToEdit(instance); setIsAddInstanceModalOpen(true); }
    };
    const handleDeleteInstanceClick = (instance: InventoryInstance) => { setShowDeleteInstanceConfirm(instance); };
    const handleConfirmDeleteInstance = async () => {
        if (!showDeleteInstanceConfirm) return;
        setIsDeleting(true);
        try { await deleteInstanceApi(showDeleteInstanceConfirm.id); fetchData(); setShowDeleteInstanceConfirm(null); } catch (err) { console.error("Failed to delete instance", err); } finally { setIsDeleting(false); }
    };

    const InstanceManager: React.FC<{ item: InventoryItemWithQuantity }> = ({ item }) => {
        const [instances, setInstances] = useState<InventoryInstance[]>([]);
        const [isLoading, setIsLoading] = useState(true);
        
        useEffect(() => {
            const fetchInstances = async () => {
                if (!item.id) { setIsLoading(false); return; }
                setIsLoading(true);
                try {
                    const data = await getInstancesByItemIdApi(item.id);
                    setInstances(data);
                } catch (error) { console.error(`Failed to fetch instances for item: '${item.name}'`, error); } 
                finally { setIsLoading(false); }
            };
            fetchInstances();
        }, [item.id, item.quantity.total]);

        const getTodayStatus = useCallback((instance: InventoryInstance): InventoryInstanceStatus => {
            const today = startOfDay(new Date()); // Use start of day for consistent comparison
            if (instance.status === 'Under Maintenance') return 'Under Maintenance';

            const isReservedToday = allEquipmentRequests.some(req => {
                if (!req.assignedItems?.some(asgn => asgn.instanceId === instance.id)) return false;
                const isActiveRequest = ['Approved', 'Ready for Pickup', 'In Use', 'Overdue'].includes(req.status);
                if (!isActiveRequest) return false;
                const reservationStart = startOfDay(new Date(req.requestedStartDate));
                const reservationEnd = endOfDay(new Date(req.requestedEndDate));
                return isWithinInterval(today, { start: reservationStart, end: reservationEnd });
            });

            if (isReservedToday) return 'Reserved';
            return 'Available';
        }, [allEquipmentRequests]);

        return (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold dark:text-gray-200">Instances ({item.quantity.total})</h4>
                    <button onClick={() => handleOpenAddInstanceModal(item)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><PlusIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
                </div>
                {isLoading ? <p className="text-sm dark:text-gray-400">Loading instances...</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
                                <tr>
                                    <th scope="col" className="px-4 py-2 rounded-l-md">Asset Tag</th>
                                    <th scope="col" className="px-4 py-2">Condition</th>
                                    <th scope="col" className="px-4 py-2">Status</th>
                                    <th scope="col" className="px-4 py-2 rounded-r-md text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {instances.length > 0 ? instances.map(inst => (
                                    <tr key={inst.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition-colors" onClick={() => handleViewInstance(inst, item)}>
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{inst.assetTag}</td>
                                        <td className="px-4 py-3"><ConditionBadge condition={inst.condition} /></td>
                                        <td className="px-4 py-3"><StatusBadge status={getTodayStatus(inst)} /></td>
                                        <td className="px-4 py-3 text-right"><InstanceActionMenu instance={inst} onEdit={handleEditInstance} onDelete={handleDeleteInstanceClick} /></td>
                                    </tr>
                                )) : ( <tr><td colSpan={4} className="px-4 py-3 text-center">No instances found.</td></tr> )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const renderItemCard = (item: InventoryItemWithQuantity) => (
        <Card key={item.id} className={`!p-0 !max-w-none transition-opacity ${item.isHidden ? 'opacity-60 grayscale' : ''}`}>
            <div className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center flex-grow">
                        <InventoryIcon className="w-6 h-6 mr-4 text-sky-500" />
                        <div>
                            <p className="font-bold text-lg dark:text-white">{item.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{areasMap.get(item.areaId) || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 text-center">
                        <div className="min-w-[50px]"><p className="font-semibold text-lg dark:text-white">{item.quantity.available}</p><p className="text-xs dark:text-gray-400">Available</p></div>
                        <div className="min-w-[50px]"><p className="font-semibold text-lg dark:text-white">{item.quantity.reserved}</p><p className="text-xs dark:text-gray-400">Reserved</p></div>
                        <div className="min-w-[50px]"><p className="font-semibold text-lg dark:text-white">{item.quantity.total}</p><p className="text-xs dark:text-gray-400">Total</p></div>
                        <div className="border-l pl-4 ml-2 dark:border-slate-700"><ItemActionMenu item={item} onEdit={handleEditItem} onHide={handleToggleHide} onDelete={handleDeleteClick} /></div>
                    </div>
                </div>
            </div>
            {expandedItemId === item.id && <InstanceManager item={item} />}
            <div className="bg-slate-50 dark:bg-slate-700/30 border-t dark:border-slate-700 p-1 flex justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={() => toggleExpand(item.id)}>
                {expandedItemId === item.id ? <ChevronUpIcon className="w-5 h-5 text-slate-500" /> : <ChevronDownIcon className="w-5 h-5 text-slate-500" />}
            </div>
        </Card>
    );

    return (
        <div>
            <div className="flex justify-end gap-2 mb-4">
                <Button className="!w-auto" onClick={() => setIsAvailabilityModalOpen(true)}>Check Availability</Button>
                <Button className="!w-auto" onClick={() => { setItemToEdit(null); setIsAddItemModalOpen(true); }}><InventoryIcon className="w-5 h-5 mr-2" />Add Equipment</Button>
            </div>
            {isLoading ? <p className="dark:text-white text-center">Loading equipment...</p> : 
             error ? <p className="text-red-500 text-center">{error}</p> :
             (
                <div className="space-y-4">
                    {visibleInventory.length > 0 ? visibleInventory.map(renderItemCard) : (visibleInventory.length === 0 && hiddenInventory.length === 0 && <Card className="!max-w-none text-center"><p className="dark:text-gray-400">No equipment match your criteria.</p></Card>)}
                    {hiddenInventory.length > 0 && (
                        <>
                            <div className="relative py-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300 dark:border-slate-600"></div></div><div className="relative flex justify-center"><span className="bg-slate-100 dark:bg-slate-900 px-3 text-sm font-medium text-slate-500 dark:text-slate-400">Hidden Items</span></div></div>
                            {hiddenInventory.map(renderItemCard)}
                        </>
                    )}
                </div>
             )
            }
            {isAvailabilityModalOpen && <AvailabilityCheckModal inventory={inventory} areas={areas} onClose={() => setIsAvailabilityModalOpen(false)} />}
            {viewingInstance && itemForNewInstance && <InstanceDetailsModal instance={viewingInstance} item={itemForNewInstance} onClose={() => { setViewingInstance(null); setItemForNewInstance(null); }} onUpdate={fetchData} />}
            {isAddItemModalOpen && <AddItemModal manageableAreas={manageableAreas} onClose={() => setIsAddItemModalOpen(false)} onProceed={handleProceedFromAddItem} initialData={itemToEdit || undefined} />}
            {isAddInstanceModalOpen && itemForNewInstance && <AddInstanceModal item={itemForNewInstance} onClose={() => setIsAddInstanceModalOpen(false)} onSuccess={() => { fetchData(); setIsAddInstanceModalOpen(false); }} initialData={instanceToEdit || undefined} />}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Delete Equipment Type?</h3>
                            <p className="text-slate-600 dark:text-slate-300 my-2">Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?</p>
                            <p className="text-sm text-rose-600 dark:text-rose-400">This will permanently delete <strong>all {showDeleteConfirm.quantity.total} instances</strong> and associated data. This action cannot be undone.</p>
                        </div>
                        <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50"><Button onClick={() => setShowDeleteConfirm(null)} className="!w-auto" variant="secondary">Cancel</Button><Button onClick={handleConfirmDelete} isLoading={isDeleting} variant="danger" className="!w-auto">Delete Permanently</Button></div>
                    </div>
                </div>
            )}
             {showDeleteInstanceConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteInstanceConfirm(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6"><h3 className="text-xl font-bold text-slate-900 dark:text-white">Delete Instance?</h3><p className="text-slate-600 dark:text-slate-300 my-2">Are you sure you want to delete instance <strong>{showDeleteInstanceConfirm.assetTag}</strong>?</p><p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone.</p></div>
                        <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50"><Button onClick={() => setShowDeleteInstanceConfirm(null)} className="!w-auto" variant="secondary">Cancel</Button><Button onClick={handleConfirmDeleteInstance} isLoading={isDeleting} variant="danger" className="!w-auto">Delete</Button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipmentManagement;
