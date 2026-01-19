import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Area, RoomTypeWithQuantity, RoomTypeForCatalog, RoomInstance, User } from '../../types';
import { createRoomRequestApi } from '../../../backend/api/roomRequests';
import { getRoomCatalogApi, checkRoomAvailabilityApi } from '../../../backend/api/rooms';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';
import { InformationCircleIcon, MailIcon, UserIcon } from '../Icons';

interface NewRoomRequestModalProps {
    areas: Area[];
    onClose: () => void;
    onSuccess: () => void;
    room?: RoomTypeWithQuantity;
    startDate: string;
    endDate: string;
    cartItem?: { type: RoomTypeForCatalog; instance: RoomInstance };
    minimumLeadDays: number;
}

interface AvailableRoomInstanceInfo {
  instance: RoomInstance;
  type: RoomTypeForCatalog;
}

const NewRoomRequestModal: React.FC<NewRoomRequestModalProps> = ({ areas, onClose, onSuccess, room, startDate, endDate, cartItem, minimumLeadDays }) => {
    const { user } = useAuth();

    const [currentStartDate, setCurrentStartDate] = useState(startDate);
    const [currentEndDate, setCurrentEndDate] = useState(endDate);

    const [availableInstances, setAvailableInstances] = useState<AvailableRoomInstanceInfo[]>([]);
    const [selectedInstanceId, setSelectedInstanceId] = useState<string | undefined>(cartItem?.instance.id);
    const [isFetchingRooms, setIsFetchingRooms] = useState(!room && !cartItem);
    const [areaFilter, setAreaFilter] = useState('all');

    const [requestedStartTime, setRequestedStartTime] = useState('09:00');
    const [requestedEndTime, setRequestedEndTime] = useState('10:00');
    const [purpose, setPurpose] = useState('');
    const [numberOfStudents, setNumberOfStudents] = useState<number | ''>('');
    const [accompanyingStudents, setAccompanyingStudents] = useState('');
    const [endorserName, setEndorserName] = useState('');
    const [endorserPosition, setEndorserPosition] = useState('');
    const [endorserEmail, setEndorserEmail] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const minDate = (() => {
        const today = new Date();
        today.setDate(today.getDate() + minimumLeadDays);
        return today.toISOString().split('T')[0];
    })();
    
    useEffect(() => {
        if (room || cartItem) return;

        const fetchRoomInstances = async () => {
            setIsFetchingRooms(true);
            setError('');
            try {
                const catalogRoomTypes = (await getRoomCatalogApi(currentStartDate, currentEndDate))
                    .filter(r => r.availabilityStatus === 'Available');

                if (catalogRoomTypes.length === 0) {
                    setAvailableInstances([]);
                    return;
                }

                const availabilityResults = await checkRoomAvailabilityApi({
                    startDate: currentStartDate,
                    endDate: currentEndDate,
                    roomTypeIds: catalogRoomTypes.map(rt => rt.id)
                });
                
                const flattenedInstances: AvailableRoomInstanceInfo[] = [];
                const typesMap = new Map(catalogRoomTypes.map(rt => [rt.id, rt]));

                for (const result of availabilityResults) {
                    const type = typesMap.get(result.roomTypeId);
                    if (type) {
                        for (const instance of result.availableInstances) {
                            flattenedInstances.push({ instance, type });
                        }
                    }
                }
                setAvailableInstances(flattenedInstances);
            } catch (err) {
                setError('Failed to load available rooms.');
            } finally {
                setIsFetchingRooms(false);
            }
        };
        fetchRoomInstances();
    }, [room, cartItem, currentStartDate, currentEndDate]);

    const activeRoomInfo = useMemo(() => {
        if (cartItem) return { instance: cartItem.instance, type: cartItem.type };
        if (room) {
            return { instance: undefined, type: room };
        }
        return availableInstances.find(({ instance }) => instance.id === selectedInstanceId);
    }, [cartItem, room, availableInstances, selectedInstanceId]);

    const activeRoomType = activeRoomInfo?.type;
    
    const isSingleDayRequest = currentStartDate === currentEndDate;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { setError('You must be logged in to make a request.'); return; }
        if (!activeRoomType) { setError('Please select a room.'); return; }
        if (new Date(`${startDate}T${requestedEndTime}`) <= new Date(`${startDate}T${requestedStartTime}`)) { setError('End time must be after start time.'); return; }
        if (!purpose.trim()) { setError('Purpose is required.'); return; }
        if (user.role === 'user') {
            if (!endorserName.trim()) { setError("Endorser's name is required."); return; }
            if (!endorserPosition.trim()) { setError("Endorser's position is required."); return; }
            if (!endorserEmail.trim()) { setError("Endorser's email is required."); return; }
        }
        if (numberOfStudents === '' || numberOfStudents <= 0) { setError('Number of students is required and must be greater than 0.'); return; }
        if (!accompanyingStudents.trim()) { setError('List of accompanying students is required.'); return; }
        if (!termsAccepted) { setError('You must accept the terms and conditions.'); return; }
        
        setIsLoading(true);
        setError('');
        try {
            const requestData: any = {
                userId: user.id,
                userName: `${user.firstName} ${user.lastName}`,
                userContact: user.emailAddress,
                instanceId: activeRoomInfo?.instance?.id,
                purpose,
                requestedStartDate: currentStartDate,
                requestedEndDate: currentEndDate,
                requestedStartTime,
                requestedEndTime,
                numberOfStudents: Number(numberOfStudents),
                accompanyingStudents: accompanyingStudents,
                isFlaggedNoShow: false,
                requestedRoom: {
                    roomTypeId: activeRoomType.id,
                    name: activeRoomType.name,
                    areaId: activeRoomType.areaId,
                },
            };

            if (user.role === 'user') {
                requestData.endorserName = endorserName;
                requestData.endorserPosition = endorserPosition;
                requestData.endorserEmail = endorserEmail;
            }

            await createRoomRequestApi(requestData);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to create room request.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStartDate = e.target.value;
        setCurrentStartDate(newStartDate);
        setSelectedInstanceId(undefined);
        if (new Date(newStartDate) > new Date(currentEndDate)) {
            setCurrentEndDate(newStartDate);
        }
    };
    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentEndDate(e.target.value);
        setSelectedInstanceId(undefined);
    };

    const areaOptions = [{ value: 'all', label: 'All Areas' }, ...areas.map(a => ({ value: a.id, label: a.name }))];

    const filteredRoomInstances = useMemo(() => {
        if (areaFilter === 'all') {
            return availableInstances;
        }
        return availableInstances.filter(({ type }) => type.areaId === areaFilter);
    }, [availableInstances, areaFilter]);


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col flex-grow min-h-0">
                     <div className="p-6 border-b dark:border-slate-700 flex-shrink-0">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Finalize Room Request</h3>
                        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                    </div>

                    <div className="p-6 space-y-4 overflow-y-auto flex-grow">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Start Date" id="start-date" type="date" value={currentStartDate} onChange={handleStartDateChange} min={minDate} required />
                            <Input label="End Date" id="end-date" type="date" value={currentEndDate} onChange={handleEndDateChange} min={currentStartDate} required />
                        </div>
                        
                        {!room && !cartItem && (
                             <>
                                <div className="p-3 bg-sky-50 dark:bg-sky-900/40 rounded-lg border border-sky-200 dark:border-sky-800 text-xs text-sky-700 dark:text-sky-300">
                                    <p>
                                        <InformationCircleIcon className="w-4 h-4 inline-block mr-1 align-middle" />
                                        Only rooms available for the selected dates are shown. For a complete list and advanced availability checking, please visit the <Link to="/catalog" state={{ activeTab: 'rooms' }} className="font-bold underline" onClick={onClose}>main catalog</Link>.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    {isFetchingRooms ? (
                                        <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-2">Loading available rooms...</p>
                                    ) : availableInstances.length > 0 ? (
                                        <>
                                            <Select
                                                label="Filter by Area"
                                                id="area-filter-rooms-modal"
                                                value={areaFilter}
                                                onChange={e => {
                                                    setAreaFilter(e.target.value);
                                                    setSelectedInstanceId(undefined);
                                                }}
                                                options={areaOptions}
                                            />
                                            <Select
                                                label="Select an Available Room"
                                                id="room-instance-select"
                                                value={selectedInstanceId || ''}
                                                onChange={e => setSelectedInstanceId(e.target.value)}
                                                options={[
                                                    { value: '', label: filteredRoomInstances.length > 0 ? 'Please select a room...' : 'No rooms match filter' },
                                                    ...filteredRoomInstances.map(({ instance, type }) => ({ value: instance.id, label: `${instance.name} (${type.name})` }))
                                                ]}
                                                required
                                            />
                                        </>
                                    ) : (
                                        <p className="text-sm text-center text-amber-700 dark:text-amber-400 py-2">No rooms are available for the selected dates.</p>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">Requesting: {activeRoomType ? `${activeRoomInfo?.instance?.name || ''} (${activeRoomType.name})` : '...'}</p>
                            {!isSingleDayRequest && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Note: Time selection applies to all days in the range.</p>}
                        </div>


                        <fieldset disabled={!activeRoomType} className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <Input label="Start Time" id="start-time" type="time" value={requestedStartTime} onChange={e => setRequestedStartTime(e.target.value)} required />
                                <Input label="End Time" id="end-time" type="time" value={requestedEndTime} onChange={e => setRequestedEndTime(e.target.value)} required />
                            </div>
                            <Input label="Purpose" id="purpose" value={purpose} onChange={e => setPurpose(e.target.value)} required />
                            {user?.role === 'user' && (
                                <div className="space-y-4 pt-4 border-t dark:border-slate-600">
                                    <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200">Endorser Information</h4>
                                    <Input 
                                        label="Endorser's Name (Faculty/Advisor)"
                                        id="endorser-name"
                                        type="text"
                                        value={endorserName}
                                        onChange={e => setEndorserName(e.target.value)}
                                        icon={<UserIcon className="w-5 h-5"/>}
                                        required
                                    />
                                    <Input 
                                        label="Endorser's Position"
                                        id="endorser-position"
                                        type="text"
                                        value={endorserPosition}
                                        onChange={e => setEndorserPosition(e.target.value)}
                                        placeholder="e.g., Professor, Department Chair"
                                        required
                                    />
                                    <Input 
                                        label="Endorser's Email"
                                        id="endorser-email"
                                        type="email"
                                        value={endorserEmail}
                                        onChange={e => setEndorserEmail(e.target.value)}
                                        icon={<MailIcon className="w-5 h-5"/>}
                                        required
                                    />
                                </div>
                            )}
                            <Input label="Number of Students" id="num-students" type="number" value={numberOfStudents} onChange={e => setNumberOfStudents(e.target.value === '' ? '' : parseInt(e.target.value, 10))} required />
                            <Textarea label="Accompanying Students" id="accompanying-students" value={accompanyingStudents} onChange={e => setAccompanyingStudents(e.target.value)} placeholder="List student names, one per line." required />
                             <div className="pt-2">
                                <Checkbox
                                    id="terms-and-conditions"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    label={
                                        <span className="text-xs text-slate-600 dark:text-slate-400">
                                            I declare that I am responsible for maintaining cleanliness and order
in the laboratory facility while I am using it.
<br/>
I understand that I may be held primarily liable for any damage or
loss of property noted during and immediately after room use.
                                        </span>
                                    }
                                />
                            </div>
                        </fieldset>
                    </div>

                     <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 rounded-b-lg">
                        <Button type="button" onClick={onClose} className="!w-auto" variant="secondary">Cancel</Button>
                        <Button type="submit" isLoading={isLoading} disabled={!termsAccepted || !activeRoomType} className="!w-auto">Submit Request</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewRoomRequestModal;