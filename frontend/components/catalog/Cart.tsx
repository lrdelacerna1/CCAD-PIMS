
import React, { useMemo } from 'react';
import { InventoryItemForCatalog, RoomTypeForCatalog, InventoryInstance, RoomInstance } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ShoppingCartIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, XIcon } from '../Icons';

type CartData = Map<string, { item: InventoryItemForCatalog, instances: Map<string, InventoryInstance> }> | { type: RoomTypeForCatalog, instance: RoomInstance } | null;

interface CartProps {
    items: CartData;
    availability: Map<string, boolean>;
    isLoading: boolean;
    isSubmittable: boolean;
    onRemove: (itemId: string, instanceId?: string) => void;
    onFinalize: () => void;
    type: 'equipment' | 'rooms';
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    minDate: string;
    isCollapsed: boolean;
    onToggleCollapse?: () => void;
    onClose?: () => void;
}

export const Cart: React.FC<CartProps> = ({
    items, availability, isLoading, isSubmittable, onRemove, onFinalize, type,
    startDate, endDate, onStartDateChange, onEndDateChange, minDate,
    isCollapsed, onToggleCollapse, onClose
}) => {
    
    const isEquipment = type === 'equipment' && items instanceof Map;
    const isRoom = type === 'rooms' && items && !(items instanceof Map);

    // FIX: Added explicit return type to useMemo to resolve 'unknown' property access errors in the JSX below.
    const equipmentItemGroups = useMemo<{ item: InventoryItemForCatalog, instances: Map<string, InventoryInstance> }[]>(() => {
        if (isEquipment && items instanceof Map) {
            return Array.from(items.values()) as { item: InventoryItemForCatalog, instances: Map<string, InventoryInstance> }[];
        }
        return [];
    }, [isEquipment, items]);

    // FIX: Explicitly cast roomItem for safe property access.
    const roomItem = isRoom ? items as { type: RoomTypeForCatalog, instance: RoomInstance } : null;
    
    const totalItemCount = useMemo(() => {
        if (isEquipment && items instanceof Map) {
            // FIX: Explicitly typed the reduce accumulator and current value to avoid 'unknown' property access errors.
            return Array.from(items.values()).reduce((sum, group: { item: InventoryItemForCatalog, instances: Map<string, InventoryInstance> }) => sum + group.instances.size, 0);
        }
        return isRoom ? 1 : 0;
    }, [items, isEquipment, isRoom]);

    if (isCollapsed) {
        return (
            <div className="bg-white dark:bg-slate-800 h-full p-4 flex flex-col items-center justify-between border-r dark:border-slate-700">
                <button onClick={onToggleCollapse} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                    <ChevronDoubleRightIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                </button>
                <div className="relative">
                    <ShoppingCartIcon className="w-8 h-8 text-slate-600 dark:text-slate-300" />
                    {totalItemCount > 0 && (
                        <span className="absolute -top-2 -right-2 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                            {totalItemCount}
                        </span>
                    )}
                </div>
                <div />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-t-lg shadow-lg flex flex-col h-full border-t border-x dark:border-slate-700 lg:border-r lg:border-t-0 lg:border-x-0 lg:rounded-none">
            <div className="flex justify-between items-center border-b dark:border-slate-600 pb-3 mb-4">
                <h2 className="text-2xl font-bold dark:text-white">Build Your Request</h2>
                {onToggleCollapse && (
                     <button onClick={onToggleCollapse} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 hidden lg:block">
                        <ChevronDoubleLeftIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </button>
                )}
                {onClose && (
                    <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 lg:hidden">
                        <XIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </button>
                )}
            </div>
            
            <div className="space-y-4 mb-6">
                <p className="block text-sm font-medium text-slate-900 dark:text-white">Select a Date Range</p>
                <Input label="Start Date" id="sidebar-start-date" type="date" value={startDate} onChange={e => onStartDateChange(e.target.value)} min={minDate} />
                <Input label="End Date" id="sidebar-end-date" type="date" value={endDate} onChange={e => onEndDateChange(e.target.value)} min={startDate} />
            </div>

            <h3 className="text-xl font-semibold dark:text-white mb-3">
                Request Cart
            </h3>
            <div className="flex-grow flex flex-col min-h-0">
                {totalItemCount === 0 ? (
                    <div className="flex-grow flex items-center justify-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <p className="text-slate-500 dark:text-slate-400">Your cart is empty.</p>
                    </div>
                ) : (
                    <div className="overflow-y-auto space-y-3 pr-2 -mr-2 flex-grow">
                        {isEquipment && equipmentItemGroups.map(({ item, instances }) => (
                            <div key={item.id} className="p-3 rounded-md bg-slate-50 dark:bg-slate-700/50">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{item.name} ({instances.size})</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {/* FIX: Cast inst to InventoryInstance to resolve 'unknown' type property access errors. */}
                                    {Array.from(instances.values()).map((inst) => {
                                        const i = inst as InventoryInstance;
                                        const isAvailable = availability.get(i.id) ?? true;
                                        return (
                                        <div key={i.id} className={`flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium border ${isAvailable ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200' : 'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-200'}`}>
                                            {i.serialNumber}
                                            <button onClick={() => onRemove(item.id, i.id)} className="rounded-full w-4 h-4 flex items-center justify-center bg-slate-200 dark:bg-slate-600 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500">
                                                &times;
                                            </button>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        ))}
                         {isRoom && roomItem && (() => {
                            const isAvailable = availability.get(roomItem.instance.id) ?? true;
                            return (
                                <div className={`p-3 rounded-md ${isAvailable ? 'bg-slate-50 dark:bg-slate-700/50' : 'bg-rose-50 dark:bg-rose-900/40'}`}>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{roomItem.type.name}</p>
                                    <div className="mt-2 flex">
                                        <div className={`flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium border ${isAvailable ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200' : 'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-200'}`}>
                                            {roomItem.instance.name}
                                            <button onClick={() => onRemove(roomItem.type.id, roomItem.instance.id)} className="rounded-full w-4 h-4 flex items-center justify-center bg-slate-200 dark:bg-slate-600 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500">
                                                &times;
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                         })()}
                    </div>
                )}
            </div>
            <div className="mt-6 border-t dark:border-slate-600 pt-4">
                {isLoading && <p className="text-sm text-center text-slate-500 dark:text-slate-400">Checking availability...</p>}
                <Button onClick={onFinalize} disabled={!isSubmittable || isLoading}>
                    Finalize Request ({totalItemCount})
                </Button>
            </div>
        </div>
    );
};
