import React, { useState, useEffect, useMemo } from 'react';
import EquipmentManagement from '../components/inventory/EquipmentManagement';
import RoomManagement from '../components/inventory/RoomManagement';
import { getAreasApi } from '../../backend/api/areas';
import { useAuth } from '../hooks/useAuth';
import { Area } from '../types';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SearchIcon } from '../components/Icons';

const InventoryPage: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'equipment' | 'rooms'>('equipment');
    const [searchQuery, setSearchQuery] = useState('');
    const [areas, setAreas] = useState<Area[]>([]);
    
    // Determine the areas the user can manage
    const manageableAreas = useMemo(() => {
        if (!user) return [];
        if (user.role === 'superadmin') return areas;
        return areas.filter(area => user.managedAreaIds?.includes(area.id));
    }, [areas, user]);

    // Set the initial state of the area filter
    const [areaFilter, setAreaFilter] = useState('all');

    useEffect(() => {
        // Default to the first managed area if the user is an admin and manages only one
        if (user?.role === 'admin' && manageableAreas.length === 1) {
            setAreaFilter(manageableAreas[0].id);
        } else {
            setAreaFilter('all');
        }
    }, [user, manageableAreas]);

    useEffect(() => {
        const fetchAreas = async () => {
            try {
                const data = await getAreasApi();
                setAreas(data);
            } catch (error) {
                console.error(
                    "We couldn’t load the list of areas at the moment. Please try again later.",
                    error
                );
            }
        };
        fetchAreas();
    }, []);

    // Reset filters when switching tabs
    useEffect(() => {
        setSearchQuery('');
        if (user?.role === 'admin' && manageableAreas.length === 1) {
            setAreaFilter(manageableAreas[0].id);
        } else {
            setAreaFilter('all');
        }
    }, [activeTab, user, manageableAreas]);

    const activeTabClasses =
        "border-b-2 border-up-maroon-700 text-up-maroon-700 dark:text-up-maroon-400 font-bold";
    const inactiveTabClasses =
        "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300";

    const areaFilterOptions = useMemo(() => {
        const options = manageableAreas.map(a => ({ value: a.id, label: a.name }));
        // Only show "All Areas" if the user can see more than one area
        if (user?.role === 'superadmin' || manageableAreas.length > 1) {
            return [{ value: 'all', label: 'All Areas' }, ...options];
        }
        return options;
    }, [manageableAreas, user]);

    return (
        <div className="container mx-auto p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-6">
                <h1 className="text-3xl font-bold dark:text-white font-heading">Inventory</h1>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="w-full sm:w-64">
                        <Input 
                            id="search-inventory"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={activeTab === 'equipment' ? "Search equipment..." : "Search rooms..."}
                            icon={<SearchIcon className="w-5 h-5" />}
                        />
                    </div>
                    {/* Only show the filter if there are options to choose from */}
                    {areaFilterOptions.length > 1 && (
                        <div className="w-full sm:w-48">
                            <Select
                                id="area-filter-inventory"
                                value={areaFilter}
                                onChange={(e) => setAreaFilter(e.target.value)}
                                options={areaFilterOptions}
                            />
                        </div>
                    )}
                </div>
            </div>
            
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('equipment')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'equipment' ? activeTabClasses : inactiveTabClasses
                        }`}
                    >
                        Equipment
                    </button>
                    <button
                        onClick={() => setActiveTab('rooms')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'rooms' ? activeTabClasses : inactiveTabClasses
                        }`}
                    >
                        Rooms
                    </button>
                </nav>
            </div>

            <div>
                {activeTab === 'equipment' && (
                    <EquipmentManagement searchQuery={searchQuery} areaFilter={areaFilter} />
                )}
                {activeTab === 'rooms' && (
                    <RoomManagement searchQuery={searchQuery} areaFilter={areaFilter} />
                )}
            </div>
        </div>
    );
};

export default InventoryPage;
