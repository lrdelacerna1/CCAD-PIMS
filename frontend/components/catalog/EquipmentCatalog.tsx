
import React, { useState, useMemo } from 'react';
import { Area, InventoryItemWithQuantity, InventoryInstanceCondition } from '../../types';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { SearchIcon } from '../Icons';

// Re-defining these here or importing them if they exist in types.ts. 
// Based on previous interactions, these might be missing or defined in backend services but needed here.
// Adding them here for safety to match what backend sends.
export type AvailabilityStatus = 
    'Available' | 
    'Unavailable: On Hold' | 
    'Unavailable: Reserved' | 
    'Unavailable: Under Maintenance' | 
    'Unavailable: No Instances' |
    'Unavailable'; // Added generic 'Unavailable' as fallback

export interface InventoryItemForCatalog extends InventoryItemWithQuantity {
    availabilityStatus: AvailabilityStatus;
    availableForDates: number;
    conditionSummary?: Partial<Record<InventoryInstanceCondition, number>>;
}

interface EquipmentCatalogProps {
    inventory: InventoryItemForCatalog[];
    areas: Area[];
    isLoading: boolean;
    error: string;
    onSelectInstances: (item: InventoryItemForCatalog) => void;
    onViewDetailsClick: (item: InventoryItemForCatalog) => void;
}

const AvailabilityBadge: React.FC<{ status: AvailabilityStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize whitespace-nowrap";
    const statusInfo: { [key in AvailabilityStatus]: { text: string; classes: string } } = {
      'Available': { text: 'Available', classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
      'Unavailable: On Hold': { text: 'On Hold', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
      'Unavailable: Reserved': { text: 'Reserved', classes: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
      'Unavailable: Under Maintenance': { text: 'Maintenance', classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
      'Unavailable: No Instances': { text: 'Unavailable', classes: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' },
      'Unavailable': { text: 'Unavailable', classes: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' },
    };

    // Fallback if status is unknown
    const info = statusInfo[status] || statusInfo['Unavailable'];

    return <span className={`${baseClasses} ${info.classes}`}>{info.text}</span>;
};


const EquipmentCatalog: React.FC<EquipmentCatalogProps> = ({ inventory, areas, isLoading, error, onSelectInstances, onViewDetailsClick }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [areaFilter, setAreaFilter] = useState('all');

    const areasMap = useMemo(() => new Map(areas.map(area => [area.id, area.name])), [areas]);
    const areaFilterOptions = useMemo(() => {
        return [
            { value: 'all', label: 'All Areas' },
            ...areas.map(a => ({ value: a.id, label: a.name }))
        ];
    }, [areas]);

    const filteredInventory = useMemo(() => {
        let processed = inventory || []; // Ensure it's an array
        if (areaFilter !== 'all') {
            processed = processed.filter(item => item.areaId === areaFilter);
        }
        if (searchQuery.trim() !== '') {
            processed = processed.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return processed;
    }, [inventory, areaFilter, searchQuery]);


    return (
        <div>
             <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                        label="Search by item name"
                        id="search-inventory"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g., Projector"
                        icon={<SearchIcon className="w-5 h-5" />}
                    />
                    <Select
                        label="Filter by area"
                        id="area-filter-inventory"
                        value={areaFilter}
                        onChange={(e) => setAreaFilter(e.target.value)}
                        options={areaFilterOptions}
                    />
                </div>
            </div>

            {isLoading ? <p className="dark:text-white text-center">Loading equipment...</p> : 
             error ? <p className="text-red-500 text-center">{error}</p> :
             (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {filteredInventory.length > 0 ? filteredInventory.map(item => {
                        const canAddMore = true; // Simplified
                        const isAvailable = item.availabilityStatus === 'Available';

                        return (
                            <Card key={item.id} className="!p-0 !max-w-none flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                {item.photoUrl ?
                                    <img src={item.photoUrl} alt={item.name} className="h-48 w-full object-cover rounded-t-xl" /> :
                                    <div className="h-48 w-full bg-slate-200 dark:bg-slate-700 rounded-t-xl flex items-center justify-center text-slate-500 text-center p-2">No Image</div>
                                }
                                <div className="p-4 flex flex-col justify-between flex-grow">
                                    <div>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-grow">
                                                <p className="font-bold text-lg dark:text-white mb-1">{item.name}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{areasMap.get(item.areaId) || 'Unknown Area'}</p>
                                            </div>
                                            <AvailabilityBadge status={item.availabilityStatus} />
                                        </div>
                                        <div className="text-sm text-slate-600 dark:text-slate-300 mt-3">
                                            Total available items: <span className="font-semibold">{item.availableForDates}</span>
                                        </div>
                                    </div>
                                    <div className="pt-4 flex flex-row gap-2">
                                        <Button 
                                            className="!flex-1 !py-0.5 !px-3 !text-xs !bg-slate-200 !text-slate-800 hover:!bg-slate-300 dark:!bg-slate-600 dark:!text-white dark:hover:!bg-slate-500 !rounded-full !h-8"
                                            onClick={() => onViewDetailsClick(item)}
                                        >
                                            DETAILS
                                        </Button>
                                        <Button 
                                            className="!flex-1 !py-0.5 !px-3 !text-xs !bg-red-700 hover:!bg-red-800 !text-white !rounded-full !h-8"
                                            onClick={() => onSelectInstances(item)}
                                            disabled={!canAddMore || !isAvailable}
                                            title={!isAvailable ? 'Item is unavailable for the selected dates.' : (!canAddMore ? `All available instances are in the cart.` : 'Add to cart')}
                                        >
                                            ADD TO CART
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )
                    }) : (
                         <div className="lg:col-span-2 2xl:col-span-3">
                            <Card className="!max-w-none text-center">
                                <p className="text-slate-500 dark:text-slate-400">No equipment items match your criteria.</p>
                            </Card>
                        </div>
                    )}
                </div>
             )
            }
        </div>
    );
};

export default EquipmentCatalog;