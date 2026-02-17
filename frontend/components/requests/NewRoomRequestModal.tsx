import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Area, RoomTypeForCatalog, RoomInstance } from '../../types';
import { createRoomRequestApi } from '../../api/roomRequests';
import { getRoomCatalogApi, checkRoomAvailabilityApi } from '../../api/rooms';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';
import { InformationCircleIcon, MailIcon, UserIcon, BriefcaseIcon, XIcon } from '../Icons';

interface RoomCartInstanceEntry {
    type: RoomTypeForCatalog;
    instance: RoomInstance;
}

interface NewRoomRequestModalProps {
    areas: Area[];
    onClose: () => void;
    onSuccess: () => void;
    rooms: Map<string, RoomCartInstanceEntry>;
    startDate: string;
    endDate: string;
    minimumLeadDays: number;
}

interface AvailableRoomInstanceInfo {
  instance: RoomInstance;
  type: RoomTypeForCatalog;
}

const NewRoomRequestModal: React.FC<NewRoomRequestModalProps> = ({ areas, onClose, onSuccess, rooms, startDate, endDate, minimumLeadDays }) => {
    const { user } = useAuth();

    const [requestRooms, setRequestRooms] = useState<Map<string, RoomCartInstanceEntry>>(rooms);
    const [currentStartDate, setCurrentStartDate] = useState(startDate);
    const [currentEndDate, setCurrentEndDate] = useState(endDate);

    const [availableInstances, setAvailableInstances] = useState<AvailableRoomInstanceInfo[]>([]);
    const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
    const [isFetchingRooms, setIsFetchingRooms] = useState(rooms.size === 0);
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
        if (rooms.size > 0) return;

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
    }, [rooms.size, currentStartDate, currentEndDate]);
    
    const isSingleDayRequest = currentStartDate === currentEndDate;

    const handleAddRoom = () => {
        if (!selectedInstanceId) return;
        const roomToAdd = availableInstances.find(({ instance }) => instance.id === selectedInstanceId);
        if (!roomToAdd) return;

        setRequestRooms(prev => {
            const newRooms = new Map(prev);
            newRooms.set(roomToAdd.instance.id, {
                type: roomToAdd.type,
                instance: roomToAdd.instance
            });
            return newRooms;
        });
        setSelectedInstanceId('');
    };

    const handleRemoveRoom = (instanceId: string) => {
        setRequestRooms(prev => {
            const newRooms = new Map(prev);
            newRooms.delete(instanceId);
            return newRooms;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { setError('You must be logged in to make a request.'); return; }
        if (requestRooms.size === 0) { setError('Please add at least one room to your request.'); return; }
        if (new Date(`${startDate}T${requestedEndTime}`) <= new Date(`${startDate}T${requestedStartTime}`)) { setError('End time must be after start time.'); return; }
        if (!purpose.trim()) { setError('Purpose is required.'); return; }
        
        if (user.role === 'student') {
            if (!endorserName.trim() || !endorserPosition.trim() || !endorserEmail.trim()) {
                setError("Endorser's name, position, and email are required for students.");
                return;
            }
        } else if (user.role === 'guest') {
            const hasAnyEndorserInfo = endorserName.trim() || endorserPosition.trim() || endorserEmail.trim();
            const hasAllEndorserInfo = endorserName.trim() && endorserPosition.trim() && endorserEmail.trim();
            if (hasAnyEndorserInfo && !hasAllEndorserInfo) {
                setError("Please fill all endorser fields if providing an endorsement, or leave them all blank.");
                return;
            }
        }

        if (numberOfStudents === '' || numberOfStudents <= 0) { setError('Number of students is required and must be greater than 0.'); return; }
        if (!accompanyingStudents.trim()) { setError('List of accompanying students is required.'); return; }
        if (!termsAccepted) { setError('You must accept the terms and conditions.'); return; }
        
        setIsLoading(true);
        setError('');
        try {
            const requestedRoomsPayload = Array.from(requestRooms.values()).map(({ type, instance }) => ({
                roomTypeId: type.id,
                name: type.name,
                areaId: type.areaId,
                instanceId: instance.id,
            }));

            const requestData: any = {
                userId: user.id,
                userName: `${user.firstName} ${user.lastName}`,
                userContact: user.emailAddress,
                purpose,
                requestedStartDate: currentStartDate,
                requestedEndDate: currentEndDate,
                requestedStartTime,
                requestedEndTime,
                numberOfStudents: Number(numberOfStudents),
                accompanyingStudents: accompanyingStudents,
                requestedRoom: requestedRoomsPayload,
            };

            const hasEndorserInfo = endorserName.trim() && endorserEmail.trim() && endorserPosition.trim();
            if (user.role === 'student' || (user.role === 'guest' && hasEndorserInfo)) {
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
        setSelectedInstanceId('');
        if (new Date(newStartDate) > new Date(currentEndDate)) {
            setCurrentEndDate(newStartDate);
        }
    };
    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentEndDate(e.target.value);
        setSelectedInstanceId('');
    };

    const areaOptions = [{ value: 'all', label: 'All Areas' }, ...areas.map(a => ({ value: a.id, label: a.name }))];

    const roomOptions = availableInstances
        .filter(({ type }) => areaFilter === 'all' || type.areaId === areaFilter)
        .filter(({ instance }) => !requestRooms.has(instance.id))
        .map(({ instance, type }) => ({
            value: instance.id,
            label: `${instance.name} (${type.name})`
        }));
    
    const cartEntries = Array.from(requestRooms.values());

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
                        
                        {rooms.size === 0 && (
                             <>
                                <div className="p-3 bg-sky-50 dark:bg-sky-900/40 rounded-lg border border-sky-200 dark:border-sky-800 text-xs text-sky-700 dark:text-sky-300">
                                    <p>
                                        <InformationCircleIcon className="w-4 h-4 inline-block mr-1 align-middle" />
                                        Only rooms available for the selected dates are shown. For a complete list and advanced availability checking, please visit the <Link to="/catalog" state={{ activeTab: 'rooms' }} className="font-bold underline" onClick={onClose}>main catalog</Link>.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                     <Select
                                        label="Filter by Area"
                                        id="area-filter-rooms-modal"
                                        value={areaFilter}
                                        onChange={e => {
                                            setAreaFilter(e.target.value);
                                            setSelectedInstanceId('');
                                        }}
                                        options={areaOptions}
                                    />
                                    <div className="flex items-end gap-2">
                                        <div className="flex-grow">
                                            <Select
                                                label="Available Rooms"
                                                id="room-instance-select"
                                                value={selectedInstanceId}
                                                onChange={e => setSelectedInstanceId(e.target.value)}
                                                options={[
                                                    { value: '', label: isFetchingRooms ? 'Loading...' : (roomOptions.length > 0 ? 'Select a room...' : 'No rooms match filter') },
                                                    ...roomOptions
                                                ]}
                                            />
                                        </div>
                                        <Button type="button" onClick={handleAddRoom} disabled={!selectedInstanceId} className="!w-auto">Add</Button>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">Requesting {requestRooms.size} Room(s)</p>
                            {cartEntries.length > 0 ? (
                                <div className="mt-2 space-y-2">
                                    {cartEntries.map(({ type, instance }) => (
                                        <div key={instance.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded">
                                            <span className="text-sm text-slate-600 dark:text-slate-300">{instance.name} ({type.name})</span>
                                            <button type="button" onClick={() => handleRemoveRoom(instance.id)} className="text-slate-400 hover:text-rose-500" title="Remove room">
                                                <XIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    {rooms.size === 0 ? 'Add rooms to your request.' : 'No rooms selected.'}
                                </p>
                            )}
                            {!isSingleDayRequest && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Note: Time selection applies to all days in the range.</p>}
                        </div>

                        <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <Input label="Start Time" id="start-time" type="time" value={requestedStartTime} onChange={e => setRequestedStartTime(e.target.value)} required />
                                <Input label="End Time" id="end-time" type="time" value={requestedEndTime} onChange={e => setRequestedEndTime(e.target.value)} required />
                            </div>
                            <Textarea label="Purpose" id="purpose" value={purpose} onChange={e => setPurpose(e.target.value)} required />
                            {(user?.role === 'student' || user?.role === 'guest') && (
                                <div className="space-y-4 pt-4 border-t dark:border-slate-600">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200">Endorser Information</h4>
                                        {user.role === 'guest' && <span className="text-xs text-slate-500 dark:text-slate-400">Optional for guests</span>}
                                    </div>
                                    {user.role === 'guest' && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                                            If you have a faculty endorser, your request will be sent to them for approval first. Otherwise, it will be sent to an admin.
                                        </p>
                                    )}
                                    <Input 
                                        label="Endorser's Name (Faculty/Advisor)"
                                        id="endorser-name"
                                        type="text"
                                        value={endorserName}
                                        onChange={e => setEndorserName(e.target.value)}
                                        icon={<UserIcon className="w-5 h-5"/>}
                                        required={user.role === 'student'}
                                    />
                                    <Input 
                                        label="Endorser's Position"
                                        id="endorser-position"
                                        type="text"
                                        value={endorserPosition}
                                        onChange={e => setEndorserPosition(e.target.value)}
                                        placeholder="e.g., Professor, Department Chair"
                                        icon={<BriefcaseIcon className="w-5 h-5"/>}
                                        required={user.role === 'student'}
                                    />
                                    <Input 
                                        label="Endorser's Email"
                                        id="endorser-email"
                                        type="email"
                                        value={endorserEmail}
                                        onChange={e => setEndorserEmail(e.target.value)}
                                        icon={<MailIcon className="w-5 h-5"/>}
                                        required={user.role === 'student'}
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
                        </div>
                    </div>

                     <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 rounded-b-lg">
                        <Button type="button" onClick={onClose} className="!w-auto" variant="secondary">Cancel</Button>
                        <Button type="submit" isLoading={isLoading} disabled={!termsAccepted} className="!w-auto">Submit Request</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewRoomRequestModal;
