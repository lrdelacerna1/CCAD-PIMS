
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Area, RoomTypeWithQuantity, RoomInstance, RoomCondition, RoomStatus, RoomAvailabilityRequest, RoomInstanceAvailabilityResult, RoomRequest, RoomType } from '../../types';
import { getRoomTypesApi, getInstancesByRoomTypeIdApi, createRoomTypeApi, createRoomInstanceApi, checkRoomAvailabilityApi, updateRoomTypeApi, deleteRoomTypeApi, updateRoomInstanceApi, deleteRoomInstanceApi } from '../../../backend/api/rooms';
import { getAllRoomRequestsApi } from '../../../backend/api/roomRequests';
import { getAreasApi } from '../../../backend/api/areas';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { SearchIcon, BuildingOfficeIcon, ChevronUpIcon, ChevronDownIcon, PlusIcon, EllipsisVerticalIcon, PencilIcon, EyeSlashIcon, EyeIcon, TrashIcon, XIcon, PhotoIcon, TagIcon, ClockIcon } from '../Icons';
import { Textarea } from '../ui/Textarea';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isWithinInterval } from 'date-fns';
import RequestHistory from './RequestHistory';

const RoomStatusBadge: React.FC<{ status: RoomStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize";
    const statusClasses: { [key in RoomStatus]: string } = {
        'Available': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        'Reserved': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        'Under Maintenance': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const RoomConditionBadge: React.FC<{ condition: RoomCondition }> = ({ condition }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize";
    const conditionClasses: { [key in RoomCondition]: string } = {
        'Newly Renovated': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'Good': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'Fair': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'Poor': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return <span className={`${baseClasses} ${conditionClasses[condition]}`}>{condition}</span>;
};

const AddRoomTypeModal: React.FC<{
    manageableAreas: Area[];
    onClose: () => void;
    onProceed: (roomType: RoomType) => void;
    initialData?: RoomType;
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
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
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
            
            // If a file was uploaded, convert to base64
            if (photoFile) {
                const reader = new FileReader();
                finalPhotoUrl = await new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(photoFile);
                });
            }

            let roomType: RoomType;
            if (initialData) {
                roomType = await updateRoomTypeApi(initialData.id, { 
                    name: name.trim(), 
                    areaId,
                    photoUrl: finalPhotoUrl || undefined
                });
            } else {
                roomType = await createRoomTypeApi({ 
                    name: name.trim(), 
                    areaId,
                    photoUrl: finalPhotoUrl || undefined
                });
            }
            onProceed(roomType);
        } catch (err: any) {
            setError(err.message || 'Failed to save room type.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <div className="flex justify-between items-center border-b pb-3 mb-4 dark:border-slate-600">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {initialData ? 'Edit Room Type' : 'Add New Room Type'}
                            </h3>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
                        </div>
                        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                        <div className="space-y-4">
                            <Input 
                                label="Room Type Name" 
                                id="room-type-name" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder="e.g., Conference Room" 
                                required 
                            />
                            <Select 
                                label="Area" 
                                id="room-type-area" 
                                value={areaId} 
                                onChange={e => setAreaId(e.target.value)} 
                                options={manageableAreas.map(a => ({ value: a.id, label: a.name }))} 
                                required 
                            />
                            
                            {/* Photo Upload Section */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    <PhotoIcon className="w-4 h-4 inline mr-2" />
                                    Room Photo (Optional)
                                </label>
                                
                                {/* Photo Preview */}
                                {photoPreview && (
                                    <div className="mb-3 relative">
                                        <img 
                                            src={photoPreview} 
                                            alt="Preview" 
                                            className="w-full h-32 object-cover rounded-lg border border-slate-300 dark:border-slate-600"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                
                                {/* File Upload */}
                                <div className="mb-2">
                                    <label 
                                        htmlFor="photo-file" 
                                        className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-sky-500 dark:hover:border-sky-500 transition-colors"
                                    >
                                        <PhotoIcon className="w-5 h-5 mr-2 text-slate-500" />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            {photoFile ? photoFile.name : 'Choose a file or drag here'}
                                        </span>
                                    </label>
                                    <input
                                        type="file"
                                        id="photo-file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>
                                
                                {/* Divider */}
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white dark:bg-gray-800 px-2 text-xs text-slate-500">OR</span>
                                    </div>
                                </div>
                                
                                {/* URL Input */}
                                <input
                                    type="url"
                                    id="room-photo-url"
                                    value={photoUrl}
                                    onChange={handleUrlChange}
                                    placeholder="Enter image URL"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-6 flex justify-end gap-3 border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                        <Button type="button" onClick={onClose} className="!w-auto" variant="secondary">Cancel</Button>
                        <Button type="submit" isLoading={isLoading} className="!w-auto">
                            {initialData ? 'Save Changes' : 'Proceed'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddRoomInstanceModal: React.FC<{
    roomType: RoomTypeWithQuantity;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: RoomInstance;
}> = ({ roomType, onClose, onSuccess, initialData }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        condition: initialData?.condition || 'Good' as RoomCondition,
        notes: initialData?.notes || '',
        capacity: initialData?.capacity || '',
        features: initialData?.features?.join(', ') || '',
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Room name/identifier is required.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const payload: Omit<RoomInstance, 'id' | 'roomTypeId' | 'status'> = {
                ...formData,
                name: formData.name.trim(),
                capacity: Number(formData.capacity) || undefined,
                features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
            };

            if (initialData) {
                // When editing, status is managed in the details modal
                await updateRoomInstanceApi(initialData.id, payload as any);
            } else {
                await createRoomInstanceApi({
                    roomTypeId: roomType.id,
                    status: 'Available',
                    ...payload,
                    photoUrls: [], // Photos managed in details modal
                });
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to save room instance.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-3 mb-4 dark:border-slate-600">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{initialData ? 'Edit Instance' : 'Add Instance'}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{roomType.name}</p>
                            </div>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
                        </div>
                        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                        <div className="space-y-4">
                            <Input label="Room Name / Identifier" name="name" id="instance-name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Conference Room A" required />
                            <Select label="Condition" id="condition" name="condition" value={formData.condition} onChange={handleInputChange} options={['Newly Renovated', 'Good', 'Fair', 'Poor'].map(c => ({ value: c, label: c }))} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Capacity (Optional)" name="capacity" id="capacity" type="number" value={formData.capacity} onChange={handleInputChange} placeholder="e.g., 12" />
                            </div>
                            <Input label="Features (comma-separated)" name="features" id="features" value={formData.features} onChange={handleInputChange} placeholder="e.g., Whiteboard, Projector" />
                            <Textarea label="Notes (Optional)" id="notes" name="notes" value={formData.notes} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="p-6 flex justify-end gap-3 border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                        <Button type="button" onClick={onClose} className="!w-auto" variant="secondary">Cancel</Button>
                        <Button type="submit" isLoading={isLoading} className="!w-auto">{initialData ? 'Save Changes' : 'Save Instance'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const RoomInstanceDetailsModal: React.FC<{ instance: RoomInstance; roomTypeName: string; onClose: () => void; onUpdate: () => void; }> = ({ instance, roomTypeName, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'calendar' | 'history'>('details');
    
    const [editedInstance, setEditedInstance] = useState(instance);
    const [newPhotoUrl, setNewPhotoUrl] = useState('');
    const [newFeature, setNewFeature] = useState('');

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
        if (activeTab === 'calendar') {
            const fetchReservations = async () => {
                setIsCalendarLoading(true);
                try {
                    const allRequests: RoomRequest[] = await getAllRoomRequestsApi();
                    const instanceRequests = allRequests.filter(req => 
                        req.instanceId === instance.id && 
                        ['Approved', 'Ready for Check-in', 'In Use', 'Overdue'].includes(req.status)
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
                    console.error("Failed to fetch reservations for room instance calendar", error);
                } finally {
                    setIsCalendarLoading(false);
                }
            };
            fetchReservations();
        }
    }, [instance.id, activeTab]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedInstance(prev => ({ ...prev, [name]: name === 'capacity' ? (value === '' ? undefined : Number(value)) : value }));
    };

    const handleAddPhoto = () => {
        if (newPhotoUrl.trim() && !editedInstance.photoUrls?.includes(newPhotoUrl.trim())) {
            setEditedInstance(prev => ({ ...prev, photoUrls: [...(prev.photoUrls || []), newPhotoUrl.trim()] }));
            setNewPhotoUrl('');
        }
    };
    const handleRemovePhoto = (urlToRemove: string) => setEditedInstance(prev => ({ ...prev, photoUrls: (prev.photoUrls || []).filter(url => url !== urlToRemove) }));

    const handleAddFeature = () => {
        if (newFeature.trim() && !editedInstance.features?.includes(newFeature.trim())) {
            setEditedInstance(prev => ({ ...prev, features: [...(prev.features || []), newFeature.trim()] }));
            setNewFeature('');
        }
    };
    const handleRemoveFeature = (featureToRemove: string) => setEditedInstance(prev => ({ ...prev, features: (prev.features || []).filter(f => f !== featureToRemove) }));

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const { status, ...payloadToUpdate } = editedInstance;
            await updateRoomInstanceApi(instance.id, { ...payloadToUpdate, blockedDates: Array.from(localBlockedDates) });
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
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{instance.name} ({roomTypeName})</h3>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select label="Condition" name="condition" id="room-condition" value={editedInstance.condition} onChange={handleInputChange} options={['Newly Renovated', 'Good', 'Fair', 'Poor'].map(c => ({ value: c, label: c }))} />
                                <Input label="Capacity" name="capacity" id="capacity" type="number" value={editedInstance.capacity || ''} onChange={handleInputChange} placeholder="e.g., 12" />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Features</label>
                                <div className="flex items-end gap-2 mb-2">
                                    <div className="flex-grow"><Input id="new-feature" value={newFeature} onChange={e => setNewFeature(e.target.value)} placeholder="e.g., Whiteboard" icon={<TagIcon className="w-5 h-5"/>} /></div>
                                    <Button type="button" onClick={handleAddFeature} disabled={!newFeature.trim()} className="!w-auto">Add</Button>
                                </div>
                                {(editedInstance.features && editedInstance.features.length > 0) ? (
                                    <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border dark:border-slate-600">
                                        {editedInstance.features.map(f => (
                                            <span key={f} className="flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-800 text-xs font-medium rounded-full dark:bg-sky-900/50 dark:text-sky-200">
                                                {f}
                                                <button onClick={() => handleRemoveFeature(f)} className="text-sky-600 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-100">&times;</button>
                                            </span>
                                        ))}
                                    </div>
                                ) : <p className="text-xs text-slate-500 dark:text-slate-400">No features added.</p>}
                            </div>
                            <Textarea label="Notes" name="notes" id="notes" value={editedInstance.notes || ''} onChange={handleInputChange} />
                        </div>
                    )}
                     {activeTab === 'photos' && (
                        <div className="space-y-4">
                            <div className="flex items-end gap-2">
                                <div className="flex-grow">
                                    <Input label="Add New Photo URL" id="new-photo-url" value={newPhotoUrl} onChange={e => setNewPhotoUrl(e.target.value)} icon={<PhotoIcon className="w-5 h-5"/>}/>
                                </div>
                                <Button type="button" onClick={handleAddPhoto} disabled={!newPhotoUrl.trim()} className="!w-auto">Add</Button>
                            </div>
                            {(editedInstance.photoUrls && editedInstance.photoUrls.length > 0) ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {editedInstance.photoUrls.map(url => (
                                        <div key={url} className="relative group">
                                            <img src={url} alt="Instance" className="rounded-lg w-full h-32 object-cover" />
                                            <button onClick={() => handleRemovePhoto(url)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <XIcon className="w-4 h-4" />
                                            </button>
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
                                        <div className="grid grid-cols-7 mb-2 text-center text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
                                        </div>
                                        <div className="grid grid-cols-7">{renderCalendar()}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {activeTab === 'history' && <RequestHistory instanceId={instance.id} />}
                </div>

                 <div className="p-4 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 mt-auto rounded-b-lg">
                    <Button onClick={onClose} className="!w-auto" variant="secondary">Cancel</Button>
                    <Button onClick={handleSaveChanges} isLoading={isSaving} disabled={!hasChanges} className="!w-auto">Save Changes</Button>
                </div>
            </div>
        </div>
    );
};

const RoomInstanceActionMenu: React.FC<{
    instance: RoomInstance;
    onEdit: (instance: RoomInstance) => void;
    onDelete: (instance: RoomInstance) => void;
}> = ({ instance, onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Options"
            >
                <EllipsisVerticalIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 z-10 overflow-hidden">
                    <button 
                        onClick={() => handleAction(() => onEdit(instance))} 
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                        <PencilIcon className="w-3 h-3" /> Edit
                    </button>
                    <button 
                        onClick={() => handleAction(() => onDelete(instance))} 
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 border-t dark:border-slate-700"
                    >
                        <TrashIcon className="w-3 h-3" /> Delete
                    </button>
                </div>
            )}
        </div>
    );
};

const RoomInstanceManager: React.FC<{ 
    roomType: RoomTypeWithQuantity; 
    allRoomRequests: RoomRequest[];
    onInstanceClick: (instance: RoomInstance) => void; 
    onAddInstance: (roomType: RoomTypeWithQuantity) => void;
    onEditInstance: (instance: RoomInstance) => void;
    onDeleteInstance: (instance: RoomInstance) => void;
}> = ({ roomType, allRoomRequests, onInstanceClick, onAddInstance, onEditInstance, onDeleteInstance }) => {
    const [instances, setInstances] = useState<RoomInstance[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInstances = async () => {
            setIsLoading(true);
            try {
                const data = await getInstancesByRoomTypeIdApi(roomType.id);
                setInstances(data);
            } catch (error) {
                console.error("Failed to fetch instances for room type:", roomType.name);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInstances();
    }, [roomType.id, roomType.name, roomType.quantity.total]);

    const getTodayStatus = useCallback((instance: RoomInstance): RoomStatus => {
        const today = startOfDay(new Date()); // Use start of day for consistent comparison
        
        if (instance.status === 'Under Maintenance') {
            return 'Under Maintenance';
        }

        const isReservedToday = allRoomRequests.some(req => {
            if (req.instanceId !== instance.id) return false;

            const isActiveRequest = ['Approved', 'Ready for Check-in', 'In Use', 'Overdue'].includes(req.status);
            if (!isActiveRequest) return false;

            const reservationStart = startOfDay(new Date(req.requestedStartDate));
            const reservationEnd = endOfDay(new Date(req.requestedEndDate));
            return isWithinInterval(today, { start: reservationStart, end: reservationEnd });
        });

        if (isReservedToday) {
            return 'Reserved';
        }

        return 'Available';
    }, [allRoomRequests]);

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold dark:text-gray-200">Instances ({roomType.quantity.total})</h4>
                <button onClick={() => onAddInstance(roomType)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                    <PlusIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
            </div>
            
            {isLoading ? <p className="text-sm dark:text-gray-400">Loading instances...</p> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
                            <tr>
                                <th scope="col" className="px-4 py-2 rounded-l-md">Name / Code</th>
                                <th scope="col" className="px-4 py-2">Condition</th>
                                <th scope="col" className="px-4 py-2">Status</th>
                                <th scope="col" className="px-4 py-2 rounded-r-md text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {instances.length > 0 ? instances.map(inst => (
                                <tr 
                                    key={inst.id} 
                                    className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                                    onClick={() => onInstanceClick(inst)}
                                >
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{inst.name}</td>
                                    <td className="px-4 py-3"><RoomConditionBadge condition={inst.condition} /></td>
                                    <td className="px-4 py-3"><RoomStatusBadge status={getTodayStatus(inst)} /></td>
                                    <td className="px-4 py-3 text-right">
                                        <RoomInstanceActionMenu 
                                            instance={inst} 
                                            onEdit={onEditInstance}
                                            onDelete={onDeleteInstance}
                                        />
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-3 text-center">No instances found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const RoomAvailabilityCheckModal: React.FC<{
    roomTypes: RoomTypeWithQuantity[];
    areas: Area[];
    onClose: () => void;
}> = ({ roomTypes, areas, onClose }) => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRoomTypes, setSelectedRoomTypes] = useState<Map<string, { name: string; areaName: string }>>(new Map());
    const [results, setResults] = useState<Map<string, RoomInstanceAvailabilityResult>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    useEffect(() => {
        const performCheck = async () => {
            if (selectedRoomTypes.size === 0 || !startDate || !endDate || new Date(endDate) < new Date(startDate)) {
                setResults(new Map<string, RoomInstanceAvailabilityResult>());
                setError('');
                return;
            }

            setIsLoading(true);
            setError('');
            const request: RoomAvailabilityRequest = {
                startDate,
                endDate,
                roomTypeIds: Array.from(selectedRoomTypes.keys()),
            };

            try {
                const data = await checkRoomAvailabilityApi(request);
                const resultMap = new Map(data.map(item => [item.roomTypeId, item]));
                setResults(resultMap);
            } catch (err) {
                setError('Failed to check availability.');
            } finally {
                setIsLoading(false);
            }
        };

        const handler = setTimeout(performCheck, 500);
        return () => clearTimeout(handler);
    }, [startDate, endDate, selectedRoomTypes]);

    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        return roomTypes.filter(rt => rt.name.toLowerCase().includes(searchQuery.toLowerCase()) && !selectedRoomTypes.has(rt.id));
    }, [searchQuery, roomTypes, selectedRoomTypes]);

    const handleSelectItem = (rt: RoomTypeWithQuantity) => {
        setSelectedRoomTypes(prev => {
            const newMap = new Map(prev);
            newMap.set(rt.id, { name: rt.name, areaName: areas.find(a => a.id === rt.areaId)?.name || 'N/A' });
            return newMap;
        });
        setSearchQuery('');
    };

    const handleRemoveItem = (roomTypeId: string) => {
        setSelectedRoomTypes(prev => {
            const newMap = new Map(prev);
            newMap.delete(roomTypeId);
            return newMap;
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-gray-600">
                    <h3 className="text-xl font-bold text-white">Check Room Availability</h3>
                    {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                </div>

                <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Start Date" id="check-start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <Input label="End Date" id="check-end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <div className="relative">
                        <Input label="Search and select a room type" id="room-type-search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} icon={<SearchIcon className="w-5 h-5" />} />
                        {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.map(rt => ( <div key={rt.id} onClick={() => handleSelectItem(rt)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">{rt.name} ({areas.find(a => a.id === rt.areaId)?.name || 'N/A'})</div> ))}
                            </div>
                        )}
                    </div>
                    <div className="space-y-4">
                        {Array.from(selectedRoomTypes.entries()).map(([rtId, rtData]) => {
                            const result = results.get(rtId);
                            return (
                            <Card key={rtId} className="!max-w-none !p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="font-bold text-lg dark:text-white">{rtData.name} ({rtData.areaName})</p>
                                    <button onClick={() => handleRemoveItem(rtId)} className="text-red-500 hover:text-red-700">&times;</button>
                                </div>
                                {isLoading && selectedRoomTypes.has(rtId) ? <p className="text-sm dark:text-gray-400">Checking...</p> : result && (
                                    <div>
                                        <h4 className="text-sm font-semibold dark:text-gray-300 mb-2">Available for the entire period:</h4>
                                        {result.availableInstances.length > 0 ? (
                                            <ul className="space-y-1">
                                                {result.availableInstances.map(inst => <li key={inst.id} className="text-sm p-2 bg-green-50 dark:bg-green-900/50 rounded">{inst.name} - {inst.condition}</li>)}
                                            </ul>
                                        ) : <p className="text-sm p-2 bg-red-50 dark:bg-red-900/50 rounded text-red-700 dark:text-red-300">No single room is available for the full duration.</p>}
                                    </div>
                                )}
                            </Card>
                        )})}
                        {selectedRoomTypes.size === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-4">Search for room types to check their availability.</p>}
                    </div>
                </div>

                <div className="p-6 flex justify-end gap-3 border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                    <Button onClick={onClose} className="!w-auto" variant="secondary">Close</Button>
                </div>
            </div>
        </div>
    );
};

const RoomActionMenu: React.FC<{
    roomType: RoomTypeWithQuantity;
    onEdit: (roomType: RoomTypeWithQuantity) => void;
    onHide: (roomType: RoomTypeWithQuantity) => void;
    onDelete: (roomType: RoomTypeWithQuantity) => void;
}> = ({ roomType, onEdit, onHide, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Options"
            >
                <EllipsisVerticalIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 z-10 overflow-hidden">
                    <button 
                        onClick={() => handleAction(() => onEdit(roomType))} 
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                        <PencilIcon className="w-4 h-4" /> Edit
                    </button>
                    <button 
                        onClick={() => handleAction(() => onHide(roomType))} 
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                        {roomType.isHidden ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                        {roomType.isHidden ? 'Unhide' : 'Hide'}
                    </button>
                    <button 
                        onClick={() => handleAction(() => onDelete(roomType))} 
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 border-t dark:border-slate-700"
                    >
                        <TrashIcon className="w-4 h-4" /> Delete
                    </button>
                </div>
            )}
        </div>
    );
};

interface RoomManagementProps {
    searchQuery: string;
    areaFilter: string;
}

const RoomManagement: React.FC<RoomManagementProps> = ({ searchQuery, areaFilter }) => {
    const { user } = useAuth();
    const [roomTypes, setRoomTypes] = useState<RoomTypeWithQuantity[]>([]);
    const [allRoomRequests, setAllRoomRequests] = useState<RoomRequest[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [expandedRoomTypeId, setExpandedRoomTypeId] = useState<string | null>(null);
    
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [viewingInstance, setViewingInstance] = useState<RoomInstance | null>(null);
    const [parentRoomType, setParentRoomType] = useState<RoomTypeWithQuantity | null>(null);
    
    const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
    const [isAddInstanceModalOpen, setIsAddInstanceModalOpen] = useState(false);
    const [roomTypeForNewInstance, setRoomTypeForNewInstance] = useState<RoomTypeWithQuantity | null>(null);
    const [roomTypeToEdit, setRoomTypeToEdit] = useState<RoomTypeWithQuantity | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<RoomTypeWithQuantity | null>(null);
    
    const [instanceToEdit, setInstanceToEdit] = useState<RoomInstance | null>(null);
    const [showDeleteInstanceConfirm, setShowDeleteInstanceConfirm] = useState<RoomInstance | null>(null);

    const [isDeleting, setIsDeleting] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [typesData, areasData, requestsData] = await Promise.all([
                getRoomTypesApi(), 
                getAreasApi(),
                getAllRoomRequestsApi()
            ]);
            setRoomTypes(typesData);
            setAreas(areasData);
            setAllRoomRequests(requestsData);
        } catch (err) {
            setError('Failed to load room data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const areasMap = useMemo(() => new Map(areas.map(area => [area.id, area.name])), [areas]);
    const manageableAreas = useMemo(() => user?.role === 'superadmin' ? areas : areas.filter(a => user?.managedAreaIds?.includes(a.id)), [areas, user]);

    const filteredRoomTypes = useMemo(() => {
        let processed = roomTypes.filter(rt => manageableAreas.some(a => a.id === rt.areaId));
        if (areaFilter !== 'all') processed = processed.filter(rt => rt.areaId === areaFilter);
        if (searchQuery.trim() !== '') processed = processed.filter(rt => rt.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return processed;
    }, [roomTypes, areaFilter, searchQuery, manageableAreas]);

    const visibleRoomTypes = useMemo(() => filteredRoomTypes.filter(rt => !rt.isHidden), [filteredRoomTypes]);
    const hiddenRoomTypes = useMemo(() => filteredRoomTypes.filter(rt => rt.isHidden), [filteredRoomTypes]);

    const toggleExpand = (typeId: string) => setExpandedRoomTypeId(prevId => (prevId === typeId ? null : typeId));
    const handleViewInstance = (instance: RoomInstance, parentType: RoomTypeWithQuantity) => {
        setViewingInstance(instance);
        setParentRoomType(parentType);
    };
    const handleOpenAddInstanceModal = (roomType: RoomTypeWithQuantity) => {
        setRoomTypeForNewInstance(roomType);
        setInstanceToEdit(null);
        setIsAddInstanceModalOpen(true);
    };

    const handleProceedFromAddType = (newRoomType: RoomType) => {
        setIsAddTypeModalOpen(false);
        setRoomTypeToEdit(null); // Clear edit state

        if (roomTypeToEdit) {
            fetchData();
        } else {
            const roomTypeWithQuantity: RoomTypeWithQuantity = {
                ...newRoomType,
                quantity: { total: 0, available: 0, reserved: 0, underMaintenance: 0 }
            };
            setRoomTypeForNewInstance(roomTypeWithQuantity);
            setIsAddInstanceModalOpen(true);
            fetchData();
        }
    };

    const handleEditRoomType = (roomType: RoomTypeWithQuantity) => {
        setRoomTypeToEdit(roomType);
        setIsAddTypeModalOpen(true);
    };

    const handleToggleHide = async (roomType: RoomTypeWithQuantity) => {
        try {
            await updateRoomTypeApi(roomType.id, { 
                name: roomType.name, 
                areaId: roomType.areaId, 
                isHidden: !roomType.isHidden 
            });
            fetchData();
        } catch (err) {
            console.error("Failed to toggle visibility", err);
        }
    };

    const handleDeleteClick = (roomType: RoomTypeWithQuantity) => setShowDeleteConfirm(roomType);

    const handleConfirmDelete = async () => {
        if (!showDeleteConfirm) return;
        setIsDeleting(true);
        try {
            await deleteRoomTypeApi(showDeleteConfirm.id);
            fetchData();
            setShowDeleteConfirm(null);
        } catch (err) {
            console.error("Failed to delete room type", err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditInstance = (instance: RoomInstance) => {
        const parent = roomTypes.find(rt => rt.id === instance.roomTypeId);
        if (parent) {
            setRoomTypeForNewInstance(parent);
            setInstanceToEdit(instance);
            setIsAddInstanceModalOpen(true);
        }
    };

    const handleDeleteInstanceClick = (instance: RoomInstance) => setShowDeleteInstanceConfirm(instance);

    const handleConfirmDeleteInstance = async () => {
        if (!showDeleteInstanceConfirm) return;
        setIsDeleting(true);
        try {
            await deleteRoomInstanceApi(showDeleteInstanceConfirm.id);
            fetchData();
            setShowDeleteInstanceConfirm(null);
        } catch (err) {
            console.error("Failed to delete instance", err);
        } finally {
            setIsDeleting(false);
        }
    };

    const renderRoomCard = (rt: RoomTypeWithQuantity) => (
        <Card key={rt.id} className={`!p-0 !max-w-none transition-opacity ${rt.isHidden ? 'opacity-60 grayscale' : ''}`}>
            <div className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center flex-grow">
                        <BuildingOfficeIcon className="w-6 h-6 mr-4 text-indigo-500" />
                        <div>
                            <p className="font-bold text-lg dark:text-white">{rt.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{areasMap.get(rt.areaId) || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 text-center">
                         <div className="min-w-[50px]"><p className="font-semibold text-lg dark:text-white">{rt.quantity.available}</p><p className="text-xs dark:text-gray-400">Available</p></div>
                         <div className="min-w-[50px]"><p className="font-semibold text-lg dark:text-white">{rt.quantity.reserved}</p><p className="text-xs dark:text-gray-400">Reserved</p></div>
                         <div className="min-w-[50px]"><p className="font-semibold text-lg dark:text-white">{rt.quantity.total}</p><p className="text-xs dark:text-gray-400">Total</p></div>
                         <div className="border-l pl-4 ml-2 dark:border-slate-700">
                            <RoomActionMenu 
                                roomType={rt}
                                onEdit={handleEditRoomType}
                                onHide={handleToggleHide}
                                onDelete={handleDeleteClick}
                            />
                        </div>
                    </div>
                </div>
            </div>
            {expandedRoomTypeId === rt.id && (
                <RoomInstanceManager 
                    roomType={rt} 
                    allRoomRequests={allRoomRequests}
                    onInstanceClick={(instance) => handleViewInstance(instance, rt)} 
                    onAddInstance={handleOpenAddInstanceModal} 
                    onEditInstance={handleEditInstance}
                    onDeleteInstance={handleDeleteInstanceClick}
                />
            )}
            <div 
                className="bg-slate-50 dark:bg-slate-700/30 border-t dark:border-slate-700 p-1 flex justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={() => toggleExpand(rt.id)}
            >
                {expandedRoomTypeId === rt.id ? <ChevronUpIcon className="w-5 h-5 text-slate-500" /> : <ChevronDownIcon className="w-5 h-5 text-slate-500" />}
            </div>
        </Card>
    );

    return (
        <div>
            <div className="flex justify-end gap-2 mb-4">
                 <Button className="!w-auto" onClick={() => setIsAvailabilityModalOpen(true)}>Check Availability</Button>
                <Button className="!w-auto" onClick={() => { setRoomTypeToEdit(null); setIsAddTypeModalOpen(true); }}><BuildingOfficeIcon className="w-5 h-5 mr-2" />Add Room Type</Button>
            </div>
            {isLoading ? <p className="dark:text-white text-center">Loading rooms...</p> : 
             error ? <p className="text-red-500 text-center">{error}</p> :
             (
                <div className="space-y-4">
                    {visibleRoomTypes.length > 0 ? (
                        visibleRoomTypes.map(renderRoomCard)
                    ) : (
                        visibleRoomTypes.length === 0 && hiddenRoomTypes.length === 0 && (
                            <Card className="!max-w-none text-center"><p className="dark:text-gray-400">No rooms match your criteria.</p></Card>
                        )
                    )}
                    {hiddenRoomTypes.length > 0 && (
                        <>
                            <div className="relative py-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300 dark:border-slate-600"></div></div><div className="relative flex justify-center"><span className="bg-slate-100 dark:bg-slate-900 px-3 text-sm font-medium text-slate-500 dark:text-slate-400">Hidden Rooms</span></div></div>
                            {hiddenRoomTypes.map(renderRoomCard)}
                        </>
                    )}
                </div>
             )
            }
            {isAvailabilityModalOpen && <RoomAvailabilityCheckModal roomTypes={roomTypes} areas={areas} onClose={() => setIsAvailabilityModalOpen(false)} />}
            {viewingInstance && parentRoomType && <RoomInstanceDetailsModal instance={viewingInstance} roomTypeName={parentRoomType.name} onClose={() => { setViewingInstance(null); setParentRoomType(null); }} onUpdate={fetchData} />}
            {isAddTypeModalOpen && (<AddRoomTypeModal manageableAreas={manageableAreas} onClose={() => setIsAddTypeModalOpen(false)} onProceed={handleProceedFromAddType} initialData={roomTypeToEdit || undefined} />)}
            {isAddInstanceModalOpen && roomTypeForNewInstance && (<AddRoomInstanceModal roomType={roomTypeForNewInstance} onClose={() => setIsAddInstanceModalOpen(false)} onSuccess={() => { fetchData(); setIsAddInstanceModalOpen(false); }} initialData={instanceToEdit || undefined} />)}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Delete Room Type?</h3>
                            <p className="text-slate-600 dark:text-slate-300 my-2">Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?</p>
                            <p className="text-sm text-rose-600 dark:text-rose-400">This will permanently delete <strong>all instances</strong> and associated data. This action cannot be undone.</p>
                        </div>
                        <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                            <Button onClick={() => setShowDeleteConfirm(null)} className="!w-auto" variant="secondary">Cancel</Button>
                            <Button onClick={handleConfirmDelete} isLoading={isDeleting} variant="danger" className="!w-auto">Delete Permanently</Button>
                        </div>
                    </div>
                </div>
            )}
            {showDeleteInstanceConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteInstanceConfirm(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Delete Instance?</h3>
                            <p className="text-slate-600 dark:text-slate-300 my-2">Are you sure you want to delete the room instance <strong>{showDeleteInstanceConfirm.name}</strong>?</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
                        </div>
                        <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                            <Button onClick={() => setShowDeleteInstanceConfirm(null)} className="!w-auto" variant="secondary">Cancel</Button>
                            <Button onClick={handleConfirmDeleteInstance} isLoading={isDeleting} variant="danger" className="!w-auto">Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomManagement;
