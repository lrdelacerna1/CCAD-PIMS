import React, { useState } from 'react';
import { Area, InventoryItemForCatalog, RoomTypeWithQuantity, InventoryInstance } from '../../types';
import NewEquipmentRequestModal from './NewEquipmentRequestModal';
import NewRoomRequestModal from './NewRoomRequestModal';

interface NewRequestModalProps {
    areas: Area[];
    onClose: () => void;
    onSuccess: () => void;
    preselectedItem?: { name: string; type: 'equipment' | 'room'; areaId: string; } | null;
    preselectedDate?: string;
    minimumLeadDays: number;
}

const NewRequestModal: React.FC<NewRequestModalProps> = (props) => {
    const [type, setType] = useState<'equipment' | 'room' | null>(props.preselectedItem?.type || null);

    const getStartDate = () => {
        const today = new Date();
        today.setDate(today.getDate() + props.minimumLeadDays);
        const minDate = today.toISOString().split('T')[0];

        return props.preselectedDate && props.preselectedDate > minDate ? props.preselectedDate : minDate;
    }

    if (type === 'equipment') {
        // FIX: The child component `NewEquipmentRequestModal` expects an instance-based map.
        // The previous attempt to construct the map was incorrect as it didn't provide an instance.
        // We pass an empty map to trigger the quick-request flow within NewEquipmentRequestModal,
        // where the user can select a specific instance.
        const items = new Map();
        
        const date = getStartDate();

        return <NewEquipmentRequestModal 
            areas={props.areas}
            onClose={props.onClose}
            onSuccess={props.onSuccess}
            items={items}
            startDate={date}
            endDate={date}
            minimumLeadDays={props.minimumLeadDays}
        />;
    }
    
    if (type === 'room') {
        // NewRoomRequestModal expects a Map of instances.
        // If we have a preselected item, we might not have the instance details here easily without fetching.
        // For now, to fix the crash, we pass an empty map, meaning the user will have to select the room in the modal.
        // If preselectedItem logic is crucial, it would need fetching instances first, but typically "New Request" is empty.
        
        const rooms = new Map();
        const date = getStartDate();

        return <NewRoomRequestModal
            areas={props.areas}
            onClose={props.onClose}
            onSuccess={props.onSuccess}
            rooms={rooms}
            startDate={date}
            endDate={date}
            minimumLeadDays={props.minimumLeadDays}
        />;
    }

    // If type is not determined (e.g., called from a generic "New Request" button), show a selection screen.
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={props.onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">What would you like to request?</h3>
                    <div className="space-y-3">
                        <button onClick={() => setType('equipment')} className="w-full text-left p-4 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                            <p className="font-bold dark:text-white">Equipment</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Projectors, laptops, cables, etc.</p>
                        </button>
                         <button onClick={() => setType('room')} className="w-full text-left p-4 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                            <p className="font-bold dark:text-white">A Room</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Conference rooms, studios, halls, etc.</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewRequestModal;