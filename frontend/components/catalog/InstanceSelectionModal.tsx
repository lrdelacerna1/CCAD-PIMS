import React, { useState, useEffect } from 'react';
import { InventoryItemForCatalog, RoomTypeForCatalog, InventoryInstance, RoomInstance } from '../../types';
import { getInstancesByItemIdApi, checkAvailabilityApi } from '../../../backend/api/inventory';
import { getInstancesByRoomTypeIdApi, checkRoomAvailabilityApi } from '../../../backend/api/rooms';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { XIcon } from '../Icons';

interface InstanceSelectionModalProps {
    item: InventoryItemForCatalog | RoomTypeForCatalog;
    startDate: string;
    endDate: string;
    onClose: () => void;
    onConfirm: (item: InventoryItemForCatalog | RoomTypeForCatalog, selectedInstances: (InventoryInstance | RoomInstance)[]) => void;
    alreadySelectedIds: Set<string>;
}

const InstanceSelectionModal: React.FC<InstanceSelectionModalProps> = ({ item, startDate, endDate, onClose, onConfirm, alreadySelectedIds }) => {
    const [allInstances, setAllInstances] = useState<(InventoryInstance | RoomInstance)[]>([]);
    const [availableInstanceIds, setAvailableInstanceIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const isEquipment = 'conditionSummary' in item;

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');
            try {
                let instances: (InventoryInstance | RoomInstance)[];
                let availableInstancesResult: { availableInstances: { id: string }[] }[] = [];

                if (isEquipment) {
                    instances = await getInstancesByItemIdApi(item.id);
                    const availabilityResult = await checkAvailabilityApi({ startDate, endDate, itemIds: [item.id] });
                    if (availabilityResult[0]) {
                        availableInstancesResult = [{ availableInstances: availabilityResult[0].availableInstances }];
                    }
                } else {
                    instances = await getInstancesByRoomTypeIdApi(item.id);
                    const availabilityResult = await checkRoomAvailabilityApi({ startDate, endDate, roomTypeIds: [item.id] });
                    if (availabilityResult[0]) {
                        availableInstancesResult = [{ availableInstances: availabilityResult[0].availableInstances }];
                    }
                }

                setAllInstances(instances);
                const availableIds = new Set(availableInstancesResult[0]?.availableInstances.map(i => i.id));
                setAvailableInstanceIds(availableIds);
            } catch (err) {
                setError('Failed to load instance data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [item, startDate, endDate, isEquipment]);
    
    const handleToggleSelection = (instanceId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(instanceId)) {
                newSet.delete(instanceId);
            } else {
                if (!isEquipment) {
                    newSet.clear();
                }
                newSet.add(instanceId);
            }
            return newSet;
        });
    };
    
    const handleConfirmClick = () => {
        const selected = allInstances.filter(inst => selectedIds.has(inst.id));
        onConfirm(item, selected);
        onClose();
    };

    const renderInstance = (instance: InventoryInstance | RoomInstance) => {
        const isSelected = selectedIds.has(instance.id);
        const isGenerallyAvailable = instance.status === 'Available';
        const isAvailableForDates = availableInstanceIds.has(instance.id);
        const isAlreadyInCart = alreadySelectedIds.has(instance.id);
        const name = isEquipment 
            ? ((instance as any).name || (instance as InventoryInstance).assetTag)
            : instance.name;
        
        const isDisabled = !isGenerallyAvailable || !isAvailableForDates || (isAlreadyInCart && !isSelected);
        
        let statusText = '';
        if (isAlreadyInCart && !isSelected) statusText = 'Already in cart';
        else if (!isGenerallyAvailable) statusText = `Unavailable: ${instance.status}`;
        else if (!isAvailableForDates) statusText = 'Unavailable for selected dates';

        return (
            <div key={instance.id} className={`p-3 rounded-md border transition-colors ${isSelected ? 'bg-sky-100 dark:bg-sky-900/50 border-sky-300 dark:border-sky-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                <Checkbox
                    id={`instance-${instance.id}`}
                    checked={isSelected}
                    onChange={() => handleToggleSelection(instance.id)}
                    disabled={isDisabled}
                    label={
                        <div className="ml-2">
                            <p className={`font-semibold ${isDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>{name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Condition: {instance.condition}</p>
                            {statusText && <p className={`text-xs ${isAlreadyInCart ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}`}>{statusText}</p>}
                        </div>
                    }
                />
            </div>
        );
    };

    const buttonText = () => {
        if (selectedIds.size === 0) return 'Add to Cart';
        if (isEquipment) {
            return `Add ${selectedIds.size} Unit${selectedIds.size > 1 ? 's' : ''} to Cart`;
        }
        return 'Add Room to Cart';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-slate-700">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select Units for {item.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{isEquipment ? 'Choose one or more units to request.' : 'Choose one room to request.'}</p>
                        </div>
                        <button onClick={onClose}><XIcon className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
                    </div>
                </div>
                <div className="p-6 space-y-3 overflow-y-auto flex-grow">
                    {isLoading && <p className="text-center text-slate-500 dark:text-slate-400">Loading units...</p>}
                    {error && <p className="text-red-500 text-center">{error}</p>}
                    {!isLoading && !error && allInstances.length > 0 ? (
                        allInstances.map(renderInstance)
                    ) : (
                       !isLoading && <p className="text-center text-slate-500 dark:text-slate-400">No units found for this item type.</p>
                    )}
                </div>
                <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <Button onClick={onClose} variant="secondary" className="!w-auto">Cancel</Button>
                    <Button onClick={handleConfirmClick} disabled={selectedIds.size === 0} className="!w-auto">
                        {buttonText()}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default InstanceSelectionModal;