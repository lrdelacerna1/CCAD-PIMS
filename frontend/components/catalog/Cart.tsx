import React, { useMemo, useState, useEffect } from 'react';
import { InventoryItemForCatalog, RoomTypeForCatalog, InventoryInstance, RoomInstance } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import { ShoppingCartIcon, ChevronDoubleLeftIcon, XIcon } from '../Icons';

type EquipmentCartData = Map<string, { item: InventoryItemForCatalog, instances: Map<string, InventoryInstance> }>;
type RoomCartData = Map<string, { type: RoomTypeForCatalog, instance: RoomInstance }>;
type CartData = EquipmentCartData | RoomCartData;

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
    // New props for time and whole day selection
    startTime?: string;
    endTime?: string;
    onStartTimeChange?: (time: string) => void;
    onEndTimeChange?: (time: string) => void;
    isWholeDay?: boolean;
    onWholeDayChange?: (isWhole: boolean) => void;
    
    minDate: string;
    isCollapsed: boolean;
    onToggleCollapse?: () => void;
    onClose?: () => void;
}

export const Cart: React.FC<CartProps> = ({
    items, availability, isLoading, isSubmittable, onRemove, onFinalize, type,
    startDate, endDate, onStartDateChange, onEndDateChange, 
    startTime = '08:00', endTime = '17:00', onStartTimeChange, onEndTimeChange, isWholeDay = false, onWholeDayChange,
    minDate, isCollapsed, onToggleCollapse, onClose
}) => {
    
    const isEquipment = type === 'equipment' && items instanceof Map;
    const isRoom = type === 'rooms' && items instanceof Map;

    const equipmentItemGroups = useMemo(() => {
        return isEquipment ? Array.from((items as EquipmentCartData).values()) : [];
    }, [isEquipment, items]);

    const roomItems = useMemo(() => {
        return isRoom ? Array.from((items as RoomCartData).values()) : [];
    }, [isRoom, items]);
    
    const totalItemCount = items.size;

    if (isCollapsed) {
        return (
            <div className="bg-white dark:bg-slate-800 h-full w-16 p-4 flex flex-col items-center justify-between border-l dark:border-slate-700">
                <button onClick={onToggleCollapse} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                    <ChevronDoubleLeftIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
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
        <div className="bg-white dark:bg-slate-800 p-4 rounded-t-lg shadow-lg flex flex-col h-full border-t border-x dark:border-slate-700 lg:border-r lg:border-t-0 lg:border-x-0 lg:rounded-none">
            <div className="flex justify-between items-center border-b dark:border-slate-600 pb-3 mb-4 max-w-[200px]">
                <h2 className="text-xl font-bold dark:text-white">Build Your Request</h2>
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
            
            <div className="space-y-4 mb-6 max-w-[200px]">
                <p className="block text-sm font-medium text-slate-900 dark:text-white">Select a Date Range</p>
                <div>
                    <Input label="Start Date" id="sidebar-start-date" type="date" value={startDate} onChange={e => onStartDateChange(e.target.value)} min={minDate} />
                </div>
                <div>
                    <Input label="End Date" id="sidebar-end-date" type="date" value={endDate} onChange={e => onEndDateChange(e.target.value)} min={startDate} />
                </div>
                
                {/* Time Selection */}
                <div className="pt-2 border-t dark:border-slate-700">
                    <p className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Time Range</p>
                    {onWholeDayChange && (
                        <div className="mb-2">
                            <Checkbox 
                                id="whole-day-toggle" 
                                checked={isWholeDay} 
                                onChange={e => onWholeDayChange(e.target.checked)}
                                label="Whole Day" 
                            />
                        </div>
                    )}
                    {!isWholeDay && onStartTimeChange && onEndTimeChange && (
                        <>
                            <div className="mb-2">
                                <Input label="Start Time" id="sidebar-start-time" type="time" value={startTime} onChange={e => onStartTimeChange(e.target.value)} />
                            </div>
                            <div>
                                <Input label="End Time" id="sidebar-end-time" type="time" value={endTime} onChange={e => onEndTimeChange(e.target.value)} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <h3 className="text-xl font-semibold dark:text-white mb-3 max-w-[200px]">
                Request Cart
            </h3>
            <div className="flex-grow flex flex-col min-h-0 max-w-[200px]">
                {totalItemCount === 0 ? (
                    <div className="flex-grow flex items-center justify-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Your cart is empty.</p>
                    </div>
                ) : (
                    <div className="overflow-y-auto space-y-3 pr-2 -mr-2 flex-grow">
                        {isEquipment && equipmentItemGroups.map(({ item, instances }) => (
                            <div key={item.id} className="p-3 rounded-md bg-slate-50 dark:bg-slate-700/50">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{item.name} ({instances.size})</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {Array.from(instances.values()).map((inst) => {
                                        const isAvailable = availability.get(inst.id) ?? true;
                                        return (
                                        <div key={inst.id} className={`flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium border ${isAvailable ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200' : 'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-200'}`}>
                                            {inst.serialNumber}
                                            <button onClick={() => onRemove(item.id, inst.id)} className="rounded-full w-4 h-4 flex items-center justify-center bg-slate-200 dark:bg-slate-600 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500">
                                                &times;
                                            </button>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        ))}
                         {isRoom && roomItems.map(({ type, instance }) => {
                            const isAvailable = availability.get(instance.id) ?? true;
                            return (
                                <div key={instance.id} className={`p-3 rounded-md ${isAvailable ? 'bg-slate-50 dark:bg-slate-700/50' : 'bg-rose-50 dark:bg-rose-900/40'}`}>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{type.name}</p>
                                    <div className="mt-2 flex">
                                        <div className={`flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium border ${isAvailable ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200' : 'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-200'}`}>
                                            {instance.name}
                                            <button onClick={() => onRemove(type.id, instance.id)} className="rounded-full w-4 h-4 flex items-center justify-center bg-slate-200 dark:bg-slate-600 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500">
                                                &times;
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                         })}
                    </div>
                )}
            </div>
            <div className="mt-6 border-t dark:border-slate-600 pt-4 max-w-[200px]">
                {isLoading && <p className="text-sm text-center text-slate-500 dark:text-slate-400">Checking availability...</p>}
                <Button onClick={onFinalize} disabled={!isSubmittable || isLoading} className="!whitespace-nowrap !text-xs !h-8 !py-1">
                    FINALIZE REQUEST ({totalItemCount})
                </Button>
            </div>
        </div>
    );
};
