import React, { useState, useMemo } from 'react';
import { Area, RoomTypeForCatalog, AvailabilityStatus } from '../../types';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { SearchIcon } from '../Icons';

interface RoomCatalogProps {
    roomTypes: RoomTypeForCatalog[];
    areas: Area[];
    isLoading: boolean;
    error: string;
    onSelectInstances: (item: RoomTypeForCatalog) => void;
    onViewDetailsClick: (item: RoomTypeForCatalog) => void;
    cartedInstanceIds: Set<string>;
}

const AvailabilityBadge: React.FC<{ status: AvailabilityStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize whitespace-nowrap";
    const statusInfo: { [key in AvailabilityStatus]: { text: string; classes: string } } = {
      'Available': { text: 'Available', classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
      'Unavailable: On Hold': { text: 'On Hold', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
      'Unavailable: Reserved': { text: 'Reserved', classes: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
      'Unavailable: Under Maintenance': { text: 'Maintenance', classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
      'Unavailable: No Instances': { text: 'Unavailable', classes: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' },
    };
    return <span className={`${baseClasses} ${statusInfo[status].classes}`}>{statusInfo[status].text}</span>;
};

const RoomCatalog: React.FC<RoomCatalogProps> = ({ roomTypes, areas, isLoading, error, onSelectInstances, onViewDetailsClick, cartedInstanceIds }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [areaFilter, setAreaFilter] = useState('all');

    const areasMap = useMemo(() => new Map(areas.map(area => [area.id, area.name])), [areas]);
    const areaFilterOptions = useMemo(() => [{ value: 'all', label: 'All Areas' }, ...areas.map(a => ({ value: a.id, label: a.name }))], [areas]);

    const filteredRoomTypes = useMemo(() => {
        let processed = roomTypes;
        if (areaFilter !== 'all') processed = processed.filter(rt => rt.areaId === areaFilter);
        if (searchQuery.trim() !== '') processed = processed.filter(rt => rt.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return processed;
    }, [roomTypes, areaFilter, searchQuery]);

    const isAnyInstanceOfTypeInCart = (roomType: RoomTypeForCatalog): boolean => {
        // This is a simplification. A more robust check would involve checking instance IDs if they were available here.
        // For now, we assume if *any* room is in the cart, we might want to prevent adding more of the same type,
        // but the new logic allows multiple different rooms. The cart itself will manage individual instances.
        // A better approach is to check based on what `cartedInstanceIds` tells us.
        // This component doesn't know which instance belongs to which type, so we can't disable a type card correctly.
        // The most user-friendly approach is to ALWAYS allow clicking "ADD TO CART" and letting the InstanceSelectionModal handle what's already selected.
        return false; 
    };

    return (
        <div>
            <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Search by room type" id="search-rooms" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g., Conference Room" icon={<SearchIcon className="w-5 h-5" />} />
                    <Select label="Filter by area" id="area-filter-rooms" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} options={areaFilterOptions} />
                </div>
            </div>

            {isLoading ? <p className="dark:text-white text-center">Loading rooms...</p> : 
             error ? <p className="text-red-500 text-center">{error}</p> :
             (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {filteredRoomTypes.length > 0 ? filteredRoomTypes.map(rt => {
                        const isAvailable = rt.availabilityStatus === 'Available';
                        
                        return (
                            <Card key={rt.id} className="!p-0 !max-w-none flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                {rt.photoUrl ?
                                    <img src={rt.photoUrl} alt={rt.name} className="h-48 w-full object-cover rounded-t-xl" /> :
                                    <div className="h-48 w-full bg-slate-200 dark:bg-slate-700 rounded-t-xl flex items-center justify-center text-slate-500 text-center p-2">No Image</div>
                                }
                                <div className="p-4 flex flex-col justify-between flex-grow">
                                    <div>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-grow">
                                                <p className="font-bold text-lg dark:text-white mb-1">{rt.name}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{areasMap.get(rt.areaId) || 'Unknown Area'}</p>
                                            </div>
                                            <AvailabilityBadge status={rt.availabilityStatus} />
                                        </div>
                                        <div className="text-sm text-slate-600 dark:text-slate-300 mt-3">
                                            Total available instances: <span className="font-semibold">{rt.availableForDates}</span>
                                        </div>
                                    </div>
                                    <div className="pt-4 flex flex-row gap-2">
                                        <Button 
                                            className="!flex-1 !py-0.5 !px-3 !text-xs !bg-slate-200 !text-slate-800 hover:!bg-slate-300 dark:!bg-slate-600 dark:!text-white dark:hover:!bg-slate-500 !rounded-full !h-8"
                                            onClick={() => onViewDetailsClick(rt)}
                                        >
                                            DETAILS
                                        </Button>
                                        <Button 
                                            className="!flex-1 !py-0.5 !px-3 !text-xs !bg-red-700 hover:!bg-red-800 !text-white !rounded-full !h-8"
                                            onClick={() => onSelectInstances(rt)}
                                            disabled={!isAvailable}
                                            title={!isAvailable ? 'This room type is unavailable for the selected dates.' : 'Select rooms to add to cart'}
                                        >
                                            ADD TO CART
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    }) : (
                        <div className="lg:col-span-2 2xl:col-span-3">
                            <Card className="!max-w-none text-center">
                                <p className="text-slate-500 dark:text-slate-400">No rooms match your criteria.</p>
                            </Card>
                        </div>
                    )}
                </div>
             )
            }
        </div>
    );
};

export default RoomCatalog;
