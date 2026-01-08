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
    isRoomInCart: boolean;
}

const AvailabilityBadge: React.FC<{ status: AvailabilityStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize whitespace-nowrap";
    const isAvailable = status === 'Available';
    const classes = isAvailable 
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';
    return <span className={`${baseClasses} ${classes}`}>{isAvailable ? 'Available' : 'Unavailable'}</span>;
};

const RoomCatalog: React.FC<RoomCatalogProps> = ({ roomTypes, areas, isLoading, error, onSelectInstances, onViewDetailsClick, isRoomInCart }) => {
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
                        const isInCart = isRoomInCart;
                        const isAvailable = rt.availabilityStatus === 'Available';
                        return (
                            <Card key={rt.id} className="!p-0 !max-w-none flex flex-col md:flex-row transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                {rt.photoUrl ?
                                    <img src={rt.photoUrl} alt={rt.name} className="h-48 w-full md:h-auto md:w-1/3 object-cover rounded-t-xl md:rounded-t-none md:rounded-l-xl" /> :
                                    <div className="h-48 w-full md:h-auto md:w-1/3 bg-slate-200 dark:bg-slate-700 rounded-t-xl md:rounded-t-none md:rounded-l-xl flex items-center justify-center text-slate-500 text-center p-2">No Image</div>
                                }
                               <div className="p-4 flex flex-col justify-between flex-grow">
                                    <div>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-bold text-lg dark:text-white">{rt.name}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{areasMap.get(rt.areaId) || 'N/A'}</p>
                                            </div>
                                            <AvailabilityBadge status={rt.availabilityStatus} />
                                        </div>
                                        <div className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                                            Total available rooms: <span className="font-semibold">{rt.availableForDates}</span>
                                        </div>
                                    </div>
                                    <div className="pt-2 flex flex-col sm:flex-row gap-2">
                                        <Button 
                                            className="!w-full !py-2 !px-4 !bg-slate-200 !text-slate-800 hover:!bg-slate-300 dark:!bg-slate-600 dark:!text-white dark:hover:!bg-slate-500"
                                            onClick={() => onViewDetailsClick(rt)}
                                        >
                                            Details
                                        </Button>
                                        <Button 
                                            className="!w-full !py-2 !px-4"
                                            onClick={() => onSelectInstances(rt)}
                                            disabled={isInCart || !isAvailable}
                                            title={!isAvailable ? 'This room type is unavailable for the selected dates.' : ''}
                                        >
                                            {isInCart ? 'In Cart' : 'Add to Cart'}
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