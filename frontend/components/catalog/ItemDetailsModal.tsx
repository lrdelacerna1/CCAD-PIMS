import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItemForCatalog, RoomTypeForCatalog, AvailabilityStatus, InventoryInstanceCondition, EquipmentRequest, RoomRequest, InventoryInstance, RoomInstance, InventoryInstanceStatus, RoomStatus, RoomCondition } from '../../types';
import { Button } from '../ui/Button';
import { getAllEquipmentRequestsApi } from '../../../backend/api/equipmentRequests';
import { getAllRoomRequestsApi } from '../../../backend/api/roomRequests';
import { getInstancesByItemIdApi, checkAvailabilityApi } from '../../../backend/api/inventory';
import { getInstancesByRoomTypeIdApi, checkRoomAvailabilityApi } from '../../../backend/api/rooms';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ChevronUpIcon, ChevronDownIcon, XIcon } from '../Icons';


interface ItemDetailsModalProps {
    item: InventoryItemForCatalog | RoomTypeForCatalog;
    areaName: string;
    onClose: () => void;
    // FIX: Rename prop from onAddToCart to onSelectInstances to match parent.
    onSelectInstances: () => void;
    isInCart: boolean;
    startDate: string;
    endDate: string;
}

const AvailabilityBadge: React.FC<{ status: AvailabilityStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-sm font-medium rounded-full capitalize whitespace-nowrap";
    const statusInfo: { [key in AvailabilityStatus]: { text: string; classes: string } } = {
      'Available': { text: 'Available', classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
      'Unavailable: On Hold': { text: 'On Hold', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
      'Unavailable: Reserved': { text: 'Reserved', classes: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
      'Unavailable: Under Maintenance': { text: 'Maintenance', classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
      'Unavailable: No Instances': { text: 'Unavailable', classes: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' },
    };
    return <span className={`${baseClasses} ${statusInfo[status].classes}`}>{statusInfo[status].text}</span>;
};

const ConditionSummary: React.FC<{ summary: Partial<Record<InventoryInstanceCondition, number>> }> = ({ summary }) => {
    const entries = Object.entries(summary);
    if (entries.length === 0) return <p className="text-slate-800 dark:text-slate-200">N/A</p>;

    return (
         <div className="flex flex-wrap gap-2">
            {entries.map(([condition, count]) => (
                <span key={condition} className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300">
                    {count} {condition}
                </span>
            ))}
        </div>
    );
}

const InstanceStatusBadge: React.FC<{ status: InventoryInstanceStatus | RoomStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize";
    const statusClasses: { [key: string]: string } = {
        'Available': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        'Reserved': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        'In Use': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        'Under Maintenance': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const InstanceConditionBadge: React.FC<{ condition: InventoryInstanceCondition | RoomCondition }> = ({ condition }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize";
    const conditionClasses: { [key in InventoryInstanceCondition | RoomCondition]: string } = {
        'Good': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        'Damaged': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        'Lost/Unusable': 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
        'Newly Renovated': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        'Fair': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
        'Poor': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    };
    return <span className={`${baseClasses} ${conditionClasses[condition]}`}>{condition}</span>;
};


const InstanceCalendar: React.FC<{
    instance: InventoryInstance | RoomInstance;
}> = ({ instance }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    // FIX: Store booked times for each date to show in tooltip
    const [bookedDates, setBookedDates] = useState<Map<string, string[]>>(new Map());
    const [isCalendarLoading, setIsCalendarLoading] = useState(true);

    const isEquipment = 'serialNumber' in instance;

    useEffect(() => {
        const fetchReservations = async () => {
            if (!instance.id) return;
            setIsCalendarLoading(true);
            try {
                const booked = new Map<string, string[]>();
                if (isEquipment) {
                    const allRequests: EquipmentRequest[] = await getAllEquipmentRequestsApi();
                    const instanceRequests = allRequests.filter(req => 
                        req.requestedItems.some(item => item.instanceId === instance.id) &&
                        ['Approved', 'Ready for Pickup', 'In Use', 'Overdue'].includes(req.status)
                    );
                    instanceRequests.forEach(req => {
                        const start = parseISO(req.requestedStartDate);
                        const end = parseISO(req.requestedEndDate);
                        if (start && end && start <= end) {
                            const interval = eachDayOfInterval({ start, end });
                            const timeRange = `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
                            interval.forEach(day => {
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const existing = booked.get(dayStr) || [];
                                existing.push(timeRange);
                                booked.set(dayStr, existing);
                            });
                        }
                    });
                } else {
                    const allRequests: RoomRequest[] = await getAllRoomRequestsApi();
                    const instanceRequests = allRequests.filter(req => 
                        req.instanceId === instance.id &&
                        ['Approved', 'Ready for Check-in', 'In Use', 'Overdue'].includes(req.status)
                    );
                     instanceRequests.forEach(req => {
                        const start = parseISO(req.requestedStartDate);
                        const end = parseISO(req.requestedEndDate);
                        if (start && end && start <= end) {
                            const interval = eachDayOfInterval({ start, end });
                            const timeRange = `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
                            interval.forEach(day => {
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const existing = booked.get(dayStr) || [];
                                existing.push(timeRange);
                                booked.set(dayStr, existing);
                            });
                        }
                    });
                }
                setBookedDates(booked);
            } catch (error) {
                console.error("Failed to fetch reservations for instance calendar", error);
            } finally {
                setIsCalendarLoading(false);
            }
        };

        fetchReservations();
    }, [instance, isEquipment]);

    const blockedDates = new Set(instance.blockedDates || []);

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const renderHeader = () => (
        <div className="flex items-center justify-between pb-2">
            <button onClick={prevMonth} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                <ChevronUpIcon className="w-5 h-5 transform -rotate-90" />
            </button>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                {format(currentDate, 'MMMM yyyy')}
            </h3>
            <button onClick={nextMonth} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                <ChevronDownIcon className="w-5 h-5 transform -rotate-90" />
            </button>
        </div>
    );
    const renderDays = () => {
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        return days.map(day => <div key={day} className="text-center text-xs text-slate-500 dark:text-slate-400 font-semibold">{day}</div>);
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });

        return allDays.map(day => {
            const dayString = format(day, 'yyyy-MM-dd');
            const bookings = bookedDates.get(dayString);
            const isBooked = bookings && bookings.length > 0;
            const isBlocked = blockedDates.has(dayString);

            let classes = 'h-8 w-8 flex items-center justify-center rounded-full text-xs transition-colors cursor-default';

            if (!isSameMonth(day, monthStart)) {
                classes += ' text-slate-400 dark:text-slate-500';
            } else if (isBooked) {
                classes += ' bg-rose-200 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 font-semibold cursor-help';
            } else if (isBlocked) {
                classes += ' bg-slate-300 dark:bg-slate-800 text-slate-800 dark:text-slate-200 line-through';
            } else {
                 classes += ' bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200';
            }
            if (isToday(day)) {
                 classes += ' ring-2 ring-sky-500';
            }
             return (
                <div key={day.toString()} className="flex justify-center items-center py-1" title={isBooked ? `Reserved:\n${bookings?.join('\n')}` : (isBlocked ? 'Blocked by Admin' : 'Available')}>
                    <div className={classes}>
                        <span>{format(day, 'd')}</span>
                    </div>
                </div>
            );
        });
    };
    
    if(isCalendarLoading) {
        return <div className="text-center p-8 text-slate-500 dark:text-slate-400">Loading calendar...</div>
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-100 dark:bg-emerald-900/50"/> Available</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-800"/> Admin Blocked</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-200 dark:bg-rose-900/50"/> Reserved</span>
            </div>
            {renderHeader()}
            <div className="grid grid-cols-7 mb-2">
                {renderDays()}
            </div>
            <div className="grid grid-cols-7">
                {renderCells()}
            </div>
        </div>
    );
};

const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({ item, areaName, onClose, onSelectInstances, isInCart, startDate, endDate }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'instances'>('details');
    
    const [instances, setInstances] = useState<(InventoryInstance | RoomInstance)[]>([]);
    const [isInstancesLoading, setIsInstancesLoading] = useState(false);
    const [selectedInstance, setSelectedInstance] = useState<InventoryInstance | RoomInstance | null>(null);
    const [availableInstanceIds, setAvailableInstanceIds] = useState<Set<string>>(new Set());
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

    const isEquipment = 'conditionSummary' in item;
    const isAvailable = item.availabilityStatus === 'Available';
    const isRoom = !isEquipment;

    useEffect(() => {
        if (activeTab !== 'instances') return;
    
        const fetchInstances = async () => {
            setIsInstancesLoading(true);
            setSelectedInstance(null); // Reset selection when tab changes
            try {
                let instanceData;
                if (isEquipment) {
                    instanceData = await getInstancesByItemIdApi(item.id);
                } else {
                    instanceData = await getInstancesByRoomTypeIdApi(item.id);
                }
                setInstances(instanceData);
                if (instanceData.length > 0) {
                    setSelectedInstance(instanceData[0]);
                }
            } catch (e) {
                console.error("Failed to fetch instances", e);
            } finally {
                setIsInstancesLoading(false);
            }
        };
        fetchInstances();
    }, [activeTab, item.id, isEquipment]);

    useEffect(() => {
        if (activeTab !== 'instances' || instances.length === 0 || !startDate || !endDate || new Date(endDate) < new Date(startDate)) {
            setAvailableInstanceIds(new Set());
            return;
        }

        const checkInstancesAvailability = async () => {
            setIsCheckingAvailability(true);
            try {
                let availableIds = new Set<string>();
                if (isEquipment) {
                    const result = await checkAvailabilityApi({ startDate, endDate, itemIds: [item.id] });
                    if (result[0]) {
                        result[0].availableInstances.forEach(inst => availableIds.add(inst.id));
                    }
                } else {
                    const result = await checkRoomAvailabilityApi({ startDate, endDate, roomTypeIds: [item.id] });
                     if (result[0]) {
                        result[0].availableInstances.forEach(inst => availableIds.add(inst.id));
                    }
                }
                setAvailableInstanceIds(availableIds);
            } catch (e) {
                console.error("Failed to check instance availability", e);
                setAvailableInstanceIds(new Set()); // Clear on error
            } finally {
                setIsCheckingAvailability(false);
            }
        };

        const handler = setTimeout(checkInstancesAvailability, 300); // Debounce
        return () => clearTimeout(handler);

    }, [instances, startDate, endDate, activeTab, item.id, isEquipment]);
    
    const activeTabClasses = "border-b-2 border-sky-500 text-sky-600 dark:text-sky-400";
    const inactiveTabClasses = "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300";

    // FIX: Rename function for clarity.
    const getSelectInstancesButtonText = () => {
        if (isEquipment) {
            return isInCart ? 'Select More Units' : 'Select Units';
        }
        return isInCart ? 'In Cart' : 'Select Room';
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center border-b pb-3 mb-4 dark:border-slate-600">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{item.name}</h3>
                      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none"><XIcon className="w-5 h-5"/></button>
                    </div>
                    
                    <div className="border-b border-slate-200 dark:border-slate-700 mb-4">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button onClick={() => setActiveTab('details')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? activeTabClasses : inactiveTabClasses}`}>
                                Details
                            </button>
                            <button onClick={() => setActiveTab('instances')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'instances' ? activeTabClasses : inactiveTabClasses}`}>
                                Instances
                            </button>
                        </nav>
                    </div>

                    <div className="overflow-y-auto" style={{maxHeight: 'calc(90vh - 250px)'}}>
                        {activeTab === 'details' && (
                             <div className="space-y-4">
                                {item.photoUrl ? (
                                    <img src={item.photoUrl} alt={`Photo of ${item.name}`} className="rounded-lg w-full h-64 object-cover bg-slate-200 dark:bg-slate-700" />
                                ) : (
                                    <div className="rounded-lg w-full h-64 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                        <p className="text-slate-500">No Photo Available</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <p className="font-semibold text-slate-600 dark:text-slate-400">Area:</p>
                                        <p className="text-slate-800 dark:text-slate-200">{areaName}</p>
                                    </div>
                                     <div>
                                        <p className="font-semibold text-slate-600 dark:text-slate-400">Availability (for selected date):</p>
                                        <AvailabilityBadge status={item.availabilityStatus} />
                                    </div>
                                </div>

                                {isEquipment && (
                                    <div>
                                         <p className="font-semibold text-slate-600 dark:text-slate-400">Condition of Usable Units:</p>
                                         <ConditionSummary summary={item.conditionSummary} />
                                    </div>
                                )}
                                
                                <div>
                                    <p className="font-semibold text-slate-600 dark:text-slate-400">Description:</p>
                                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                                        {item.description || 'No description provided.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'instances' && (
                            <div className="pt-4">
                                {(isInstancesLoading || isCheckingAvailability) ? (
                                    <div className="text-center p-8 text-slate-500 dark:text-slate-400">Loading instances...</div>
                                ) : instances.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Left Column: Instance List */}
                                        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 -mr-2">
                                            {instances.map(instance => {
                                                const isAvailableOnDate = availableInstanceIds.has(instance.id);
                                                const isGenerallyAvailable = instance.status === 'Available';
                                                const isActuallyAvailable = isGenerallyAvailable && isAvailableOnDate;

                                                return (
                                                    <div 
                                                        key={instance.id} 
                                                        onClick={() => setSelectedInstance(instance)}
                                                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedInstance?.id === instance.id ? 'bg-sky-100 dark:bg-sky-900/50 border-sky-300 dark:border-sky-700' : 'bg-slate-50 dark:bg-slate-700/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                                {/* FIX: Show Asset Tag instead of Serial Number if available for equipment */}
                                                                {isEquipment ? (instance as InventoryInstance).assetTag || (instance as InventoryInstance).serialNumber : (instance as RoomInstance).name}
                                                            </p>
                                                            {isActuallyAvailable ? (
                                                                <span className="px-2 py-1 text-xs font-medium rounded-full capitalize bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Available</span>
                                                            ) : (
                                                                <span className="px-2 py-1 text-xs font-medium rounded-full capitalize bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Unavailable</span>
                                                            )}
                                                        </div>
                                                        <div className="mt-1">
                                                            <InstanceConditionBadge condition={instance.condition as RoomCondition | InventoryInstanceCondition} />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {/* Right Column: Details & Calendar */}
                                        <div>
                                            {selectedInstance ? (
                                                 <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 -mr-2">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Photos</h4>
                                                        {(selectedInstance.photoUrls && selectedInstance.photoUrls.length > 0) ? (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {selectedInstance.photoUrls.map(url => (
                                                                    <img key={url} src={url} alt="Instance photo" className="rounded-lg w-full h-24 object-cover"/>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm text-slate-500 dark:text-slate-400">
                                                                No photos available.
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Details</h4>
                                                        <div className="space-y-3 text-sm p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                                            <div className="flex justify-between">
                                                                <p className="font-medium text-slate-600 dark:text-slate-400">{isEquipment ? 'Serial Number:' : 'Room Name:'}</p>
                                                                <p className="text-slate-800 dark:text-slate-200">{isEquipment ? (selectedInstance as InventoryInstance).serialNumber : (selectedInstance as RoomInstance).name}</p>
                                                            </div>
                                                            {selectedInstance.notes && (
                                                                <div>
                                                                    <p className="font-medium text-slate-600 dark:text-slate-400">Notes:</p>
                                                                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{selectedInstance.notes}</p>
                                                                </div>
                                                            )}
                                                            {'assetTag' in selectedInstance && selectedInstance.assetTag && (
                                                                <div>
                                                                    <p className="font-medium text-slate-600 dark:text-slate-400">Asset Tag:</p>
                                                                    <p className="text-slate-800 dark:text-slate-200">{selectedInstance.assetTag}</p>
                                                                </div>
                                                            )}
                                                            {'capacity' in selectedInstance && selectedInstance.capacity && (
                                                                <div>
                                                                    <p className="font-medium text-slate-600 dark:text-slate-400">Capacity:</p>
                                                                    <p className="text-slate-800 dark:text-slate-200">{selectedInstance.capacity} people</p>
                                                                </div>
                                                            )}
                                                            {'features' in selectedInstance && selectedInstance.features && selectedInstance.features.length > 0 && (
                                                                <div>
                                                                    <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">Features:</p>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {selectedInstance.features.map(feature => (
                                                                            <span key={feature} className="px-2 py-0.5 text-xs rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
                                                                                {feature}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Availability Calendar</h4>
                                                        <InstanceCalendar instance={selectedInstance} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                                    <p className="text-slate-500 dark:text-slate-400">Select an instance to view its details.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-8 text-slate-500 dark:text-slate-400">No instances found for this item.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 mt-auto">
                    <Button onClick={onClose} className="!w-auto !bg-slate-300 !text-black hover:!bg-slate-400">Close</Button>
                    <Button
                        onClick={onSelectInstances}
                        disabled={!isAvailable || (isRoom && isInCart)}
                        title={!isAvailable ? 'Item is unavailable for the selected dates.' : (isRoom && isInCart ? 'Room is already in your cart.' : 'Add this item to your cart')}
                        className="!w-auto"
                    >
                        {getSelectInstancesButtonText()}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailsModal;