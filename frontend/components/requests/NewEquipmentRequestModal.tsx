import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Area, InventoryItem, InventoryItemForCatalog, InventoryInstance, User } from '../../types';
import { createEquipmentRequestApi } from '../../../backend/api/equipmentRequests';
import { getInventoryCatalogApi, checkAvailabilityApi, getInventoryApi } from '../../../backend/api/inventory';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { InformationCircleIcon, XIcon, MailIcon, UserIcon } from '../Icons';
import { Select } from '../ui/Select';

interface EquipmentCartInstanceEntry {
  item: InventoryItemForCatalog;
  instance: InventoryInstance;
}

interface NewEquipmentRequestModalProps {
    areas: Area[];
    onClose: () => void;
    onSuccess: () => void;
    items: Map<string, EquipmentCartInstanceEntry>; // Key is instance ID
    startDate: string;
    endDate: string;
    minimumLeadDays: number;
}

interface AvailableInstanceInfo {
  instance: InventoryInstance;
  item: InventoryItemForCatalog;
}

const NewEquipmentRequestModal: React.FC<NewEquipmentRequestModalProps> = ({ areas, onClose, onSuccess, items, startDate, endDate, minimumLeadDays }) => {
    const { user } = useAuth();
    
    const [requestItems, setRequestItems] = useState<Map<string, EquipmentCartInstanceEntry>>(items);
    const [currentStartDate, setCurrentStartDate] = useState(startDate);
    const [currentEndDate, setCurrentEndDate] = useState(endDate);

    const [purpose, setPurpose] = useState('');
    const [secondaryContactName, setSecondaryContactName] = useState('');
    const [secondaryContactNumber, setSecondaryContactNumber] = useState('');
    const [endorserName, setEndorserName] = useState('');
    const [endorserPosition, setEndorserPosition] = useState('');
    const [endorserEmail, setEndorserEmail] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [availableInstances, setAvailableInstances] = useState<AvailableInstanceInfo[]>([]);
    const [isFetchingEquipment, setIsFetchingEquipment] = useState(items.size === 0);
    const [selectedInstanceId, setSelectedInstanceId] = useState('');
    const [areaFilter, setAreaFilter] = useState('all');
    
    const minDate = (() => {
        const today = new Date();
        today.setDate(today.getDate() + minimumLeadDays);
        return today.toISOString().split('T')[0];
    })();

    useEffect(() => {
        if (items.size > 0) return; // Don't fetch if items are pre-filled

        const handler = setTimeout(() => {
            const fetchAvailableInstances = async () => {
                setIsFetchingEquipment(true);
                setError('');
                try {
                    const catalogItems = await getInventoryCatalogApi(currentStartDate, currentEndDate);
                    const availableCatalogItems = catalogItems.filter(item => item.availabilityStatus === 'Available');

                    if (availableCatalogItems.length === 0) {
                        setAvailableInstances([]);
                        return;
                    }

                    const availabilityResults = await checkAvailabilityApi({
                        startDate: currentStartDate,
                        endDate: currentEndDate,
                        itemIds: availableCatalogItems.map(item => item.id)
                    });

                    const flattenedInstances: AvailableInstanceInfo[] = [];
                    const catalogItemsMap = new Map(availableCatalogItems.map(item => [item.id, item]));

                    for (const result of availabilityResults) {
                        const item = catalogItemsMap.get(result.itemId);
                        if (item) {
                            for (const instance of result.availableInstances) {
                                flattenedInstances.push({ instance, item });
                            }
                        }
                    }
                    setAvailableInstances(flattenedInstances);

                    setRequestItems(prev => {
                        const newItems = new Map(prev);
                        for (const instanceId of newItems.keys()) {
                            const isStillAvailable = flattenedInstances.some(avail => avail.instance.id === instanceId);
                            if (!isStillAvailable) {
                                newItems.delete(instanceId);
                            }
                        }
                        return newItems;
                    });

                } catch (err) {
                    setError('Failed to load available equipment for the selected dates.');
                } finally {
                    setIsFetchingEquipment(false);
                }
            };
            fetchAvailableInstances();
        }, 300);

        return () => clearTimeout(handler);

    }, [currentStartDate, currentEndDate, items.size]);
    
    const handleAddItem = () => {
        if (!selectedInstanceId) return;
        const itemToAdd = availableInstances.find(({ instance }) => instance.id === selectedInstanceId);
        if (!itemToAdd) return;

        setRequestItems(prev => {
            const newItems = new Map(prev);
            newItems.set(itemToAdd.instance.id, {
                item: itemToAdd.item,
                instance: itemToAdd.instance
            });
            return newItems;
        });
        setSelectedInstanceId('');
    };

    const handleRemoveItem = (instanceId: string) => {
        setRequestItems(prev => {
            const newItems = new Map(prev);
            newItems.delete(instanceId);
            return newItems;
        });
    };

    const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*$/.test(value)) {
            setSecondaryContactNumber(value);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError('You must be logged in to make a request.');
            return;
        }
        if (requestItems.size === 0) {
            setError('Please add at least one item to your request.');
            return;
        }
        if (!purpose.trim()) { setError('Purpose is required.'); return; }
        if (user.role === 'student') {
            if (!endorserName.trim()) { setError("Endorser's name is required."); return; }
            if (!endorserPosition.trim()) { setError("Endorser's position is required."); return; }
            if (!endorserEmail.trim()) { setError("Endorser's email is required."); return; }
        }
        if (!secondaryContactName.trim()) { setError('Secondary contact name is required.'); return; }
        if (!secondaryContactNumber.trim()) { setError('Secondary contact number is required.'); return; }
        
        setIsLoading(true);
        setError('');
        try {
            const requestedItemsPayload = Array.from(requestItems.values()).map(({ item, instance }) => ({
                itemId: item.id,
                name: item.name,
                areaId: item.areaId,
                instanceId: instance.id,
            }));

            await createEquipmentRequestApi({
                userId: user.id,
                userName: `${user.firstName} ${user.lastName}`,
                userContact: user.emailAddress,
                purpose,
                endorserName: user.role === 'student' ? endorserName : undefined,
                endorserPosition: user.role === 'student' ? endorserPosition : undefined,
                endorserEmail: user.role === 'student' ? endorserEmail : undefined,
                requestedStartDate: currentStartDate,
                requestedEndDate: currentEndDate,
                secondaryContactName,
                secondaryContactNumber,
                requestedItems: requestedItemsPayload,
            });
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to create equipment request.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const areaOptions = [{ value: 'all', label: 'All Areas' }, ...areas.map(a => ({ value: a.id, label: a.name }))];

    const equipmentOptions = availableInstances
        .filter(({ item }) => areaFilter === 'all' || item.areaId === areaFilter)
        .filter(({ instance }) => !requestItems.has(instance.id))
        .map(({ instance, item }) => ({
            value: instance.id,
            label: `${item.name} (SN: ${instance.serialNumber})`
        }));
        
    const cartEntries = Array.from(requestItems.values());

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col flex-grow min-h-0">
                    <div className="p-6 border-b dark:border-slate-700 flex-shrink-0">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Finalize Equipment Request</h3>
                        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                    </div>

                    <div className="p-6 space-y-4 overflow-y-auto flex-grow">
                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label="Start Date" 
                                id="start-date" 
                                type="date" 
                                value={currentStartDate} 
                                onChange={e => {
                                    const newStartDate = e.target.value;
                                    setCurrentStartDate(newStartDate);
                                    if (new Date(newStartDate) > new Date(currentEndDate)) {
                                        setCurrentEndDate(newStartDate);
                                    }
                                }} 
                                min={minDate} 
                                required 
                            />
                            <Input 
                                label="End Date" 
                                id="end-date" 
                                type="date" 
                                value={currentEndDate} 
                                onChange={e => setCurrentEndDate(e.target.value)} 
                                min={currentStartDate} 
                                required 
                            />
                        </div>
                        
                        {items.size === 0 && (
                            <>
                                <div className="p-3 bg-sky-50 dark:bg-sky-900/40 rounded-lg border border-sky-200 dark:border-sky-800 text-xs text-sky-700 dark:text-sky-300">
                                    <p>
                                        <InformationCircleIcon className="w-4 h-4 inline-block mr-1 align-middle" />
                                        Only items available for the selected dates are shown. For a complete list and advanced availability checking, please visit the <Link to="/catalog" className="font-bold underline" onClick={onClose}>main catalog</Link>.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <Select
                                        label="Filter by Area"
                                        id="area-filter-modal"
                                        value={areaFilter}
                                        onChange={e => {
                                            setAreaFilter(e.target.value);
                                            setSelectedInstanceId(''); // Reset selection
                                        }}
                                        options={areaOptions}
                                    />
                                    <div className="flex items-end gap-2">
                                        <div className="flex-grow">
                                            <Select 
                                                label="Available Equipment" 
                                                id="equipment-select" 
                                                value={selectedInstanceId}
                                                onChange={e => setSelectedInstanceId(e.target.value)}
                                                options={[
                                                    { value: '', label: isFetchingEquipment ? 'Loading...' : (equipmentOptions.length > 0 ? 'Select an item...' : 'No items match filter') },
                                                    ...equipmentOptions
                                                ]}
                                            />
                                        </div>
                                        <Button type="button" onClick={handleAddItem} disabled={!selectedInstanceId} className="!w-auto">Add</Button>
                                    </div>
                                </div>
                            </>
                        )}
                        
                        <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">Requesting {requestItems.size} Item(s)</p>
                             {cartEntries.length > 0 ? (
                                <div className="mt-2 space-y-2">
                                    {cartEntries.map(({ item, instance }) => (
                                        <div key={instance.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded">
                                            <span className="text-sm text-slate-600 dark:text-slate-300">{item.name} (SN: {instance.serialNumber})</span>
                                            <button type="button" onClick={() => handleRemoveItem(instance.id)} className="text-slate-400 hover:text-rose-500" title="Remove item">
                                                <XIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    {items.size === 0 ? 'Add equipment to your request.' : 'No items selected.'}
                                </p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <Textarea label="Purpose" id="purpose" value={purpose} onChange={e => setPurpose(e.target.value)} required />
                            {user?.role === 'student' && (
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
                            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200 pt-4 border-t dark:border-slate-600">Secondary Contact</h4>
                            <Input label="Name" id="secondary-name" value={secondaryContactName} onChange={e => setSecondaryContactName(e.target.value)} required />
                            <Input 
                                label="Contact Number" 
                                id="secondary-number" 
                                value={secondaryContactNumber} 
                                onChange={handleContactNumberChange}
                                type="tel" 
                                required 
                            />
                        </div>

                        <div className="p-3 bg-amber-50 dark:bg-amber-900/40 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-2">
                                <InformationCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                <h4 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Important Notes:</h4>
                            </div>
                            <ul className="list-disc list-inside mt-2 pl-2 text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                <li>Borrower shall be held primarily liable for any damage or loss of property noted during and immediately after the activity.</li>
                                <li>Reservation should be made at least {minimumLeadDays} day(s) before the date needed.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 rounded-b-lg">
                        <Button type="button" onClick={onClose} className="!w-auto" variant="secondary">Cancel</Button>
                        <Button type="submit" isLoading={isLoading} className="!w-auto">Submit Request</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewEquipmentRequestModal;