import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import EquipmentCatalog from '../components/catalog/EquipmentCatalog';
import RoomCatalog from '../components/catalog/RoomCatalog';
import NewEquipmentRequestModal from '../components/requests/NewEquipmentRequestModal';
import NewRoomRequestModal from '../components/requests/NewRoomRequestModal';
import ItemDetailsModal from '../components/catalog/ItemDetailsModal';
import { Area, InventoryItemForCatalog, RoomTypeForCatalog, InventoryInstance, RoomInstance, ReservationSettings } from '../types';
import { getAreasApi } from '../../backend/api/areas';
import { Cart } from '../components/catalog/Cart';
import { useCartAvailability } from '../hooks/useCartAvailability';
import { ShoppingCartIcon } from '../components/Icons';
import InstanceSelectionModal from '../components/catalog/InstanceSelectionModal';
import { getInventoryCatalogApi } from '../../backend/api/inventory';
import { getRoomCatalogApi } from '../../backend/api/rooms';
import { getSettingsApi } from '../../backend/api/settings';

// Explicit cart value types so TypeScript never widens to unknown
type EquipmentCartEntry = { item: InventoryItemForCatalog; instances: Map<string, InventoryInstance> };
type RoomCartEntry = { type: RoomTypeForCatalog; instance: RoomInstance };

const CatalogPage: React.FC = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'equipment' | 'rooms'>(
        (location.state as { activeTab?: 'equipment' | 'rooms' })?.activeTab || 'equipment'
    );
    const [areas, setAreas] = useState<Area[]>([]);
    const [equipmentInventory, setEquipmentInventory] = useState<InventoryItemForCatalog[]>([]);
    const [roomInventory, setRoomInventory] = useState<RoomTypeForCatalog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [settings, setSettings] = useState<ReservationSettings | null>(null);

    const minDate = useMemo(() => {
        const date = new Date();
        date.setDate(date.getDate() + 2);
        return date.toISOString().split('T')[0];
    }, []);

    const [startDate, setStartDate] = useState(minDate);
    const [endDate, setEndDate] = useState(minDate);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('17:00');
    const [isWholeDay, setIsWholeDay] = useState(false);

    const [equipmentCart, setEquipmentCart] = useState<Map<string, EquipmentCartEntry>>(new Map());
    const [roomCart, setRoomCart] = useState<Map<string, RoomCartEntry>>(new Map());

    const activeCart = activeTab === 'equipment' ? equipmentCart : roomCart;
    const { availability, isLoading: isAvailabilityLoading, isCartSubmittable } = useCartAvailability(activeCart, startDate, endDate, activeTab);

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState<InventoryItemForCatalog | RoomTypeForCatalog | null>(null);
    const [selectingInstancesFor, setSelectingInstancesFor] = useState<InventoryItemForCatalog | RoomTypeForCatalog | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

    useEffect(() => {
        const fetchStaticData = async () => {
            try {
                const [areasData, settingsData] = await Promise.all([
                    getAreasApi(),
                    getSettingsApi(),
                ]);
                setAreas(areasData || []);
                setSettings(settingsData || null);
            } catch (err) {
                setError('We could not load the page. Please refresh and try again.');
                setAreas([]);
                setSettings(null);
            }
        };
        fetchStaticData();
    }, []);

    const fetchCatalogData = useCallback(async () => {
        if (new Date(endDate) < new Date(startDate)) {
            setEquipmentInventory([]);
            setRoomInventory([]);
            setError('The end date cannot be earlier than the start date. Please adjust your dates and try again.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            if (activeTab === 'equipment') {
                const inventoryData = await getInventoryCatalogApi(startDate, endDate);
                setEquipmentInventory(inventoryData || []);
            } else {
                const roomData = await getRoomCatalogApi(startDate, endDate);
                setRoomInventory(roomData || []);
            }
        } catch (err) {
            setError('We could not load the catalog at this time. Please refresh the page to try again.');
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, activeTab, startTime, endTime, isWholeDay]);

    useEffect(() => { fetchCatalogData(); }, [fetchCatalogData]);
    useEffect(() => { setEquipmentCart(new Map()); setRoomCart(new Map()); }, [activeTab]);

    const totalItemCount = useMemo(() => {
        if (activeTab === 'equipment') {
            return Array.from(equipmentCart.values())
                .reduce((sum, group) => sum + group.instances.size, 0);
        }
        return roomCart.size;
    }, [equipmentCart, roomCart, activeTab]);

    const handleInstancesSelected = (
        item: InventoryItemForCatalog | RoomTypeForCatalog,
        instances: (InventoryInstance | RoomInstance)[]
    ) => {
        if (instances.length === 0) return;

        if ('serialNumber' in instances[0]) {
            setEquipmentCart(prev => {
                const newCart = new Map(prev);
                const group: EquipmentCartEntry = newCart.get(item.id)
                    || { item: item as InventoryItemForCatalog, instances: new Map() };
                (instances as InventoryInstance[]).forEach(inst => group.instances.set(inst.id, inst));
                newCart.set(item.id, group);
                return newCart;
            });
        } else {
            setRoomCart(prev => {
                const newCart = new Map(prev);
                (instances as RoomInstance[]).forEach(inst => {
                    newCart.set(inst.id, { type: item as RoomTypeForCatalog, instance: inst });
                });
                return newCart;
            });
        }
    };

    const handleRemoveFromCart = (itemId: string, instanceId?: string) => {
        if (activeTab === 'equipment') {
            setEquipmentCart(prev => {
                const newCart = new Map(prev);
                if (instanceId) {
                    const group = newCart.get(itemId);
                    if (group) {
                        group.instances.delete(instanceId);
                        if (group.instances.size === 0) newCart.delete(itemId);
                    }
                }
                return newCart;
            });
        } else if (instanceId) {
            setRoomCart(prev => {
                const newCart = new Map(prev);
                newCart.delete(instanceId);
                return newCart;
            });
        }
    };

    const handleFinalizeRequest = () => {
        if (isCartSubmittable) {
            setIsRequestModalOpen(true);
            setIsMobileCartOpen(false);
        }
    };

    const handleSuccessRequest = () => {
        setIsRequestModalOpen(false);
        if (activeTab === 'equipment') setEquipmentCart(new Map());
        else setRoomCart(new Map());
        fetchCatalogData();
    };

    const handleViewDetailsClick = (item: InventoryItemForCatalog | RoomTypeForCatalog) => setViewingItem(item);
    const handleSelectInstancesClick = (item: InventoryItemForCatalog | RoomTypeForCatalog) => {
        setViewingItem(null);
        setSelectingInstancesFor(item);
    };

    const activeTabClasses = "border-b-2 border-up-maroon-700 text-up-maroon-700 dark:text-up-maroon-400 font-bold";
    const inactiveTabClasses = "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300";

    // Pre-compute typed room cart entries to avoid unknown inference at usage sites
    const roomCartEntries = useMemo(
        (): RoomCartEntry[] => Array.from(roomCart.values()),
        [roomCart]
    );

    const equipmentCartEntries = useMemo(
        (): EquipmentCartEntry[] => Array.from(equipmentCart.values()),
        [equipmentCart]
    );

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
            <aside className={`fixed inset-y-0 right-0 z-50 w-full ${isSidebarCollapsed ? 'sm:w-16 lg:w-16' : 'sm:w-60 lg:w-60'} lg:relative transition-all duration-300 transform ${isMobileCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                <Cart
                    equipmentItems={equipmentCart}
                    roomItems={roomCart}
                    availability={availability}
                    isLoading={isAvailabilityLoading}
                    isSubmittable={isCartSubmittable}
                    onRemove={handleRemoveFromCart}
                    onFinalize={handleFinalizeRequest}
                    type={activeTab}
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    startTime={startTime}
                    endTime={endTime}
                    onStartTimeChange={setStartTime}
                    onEndTimeChange={setEndTime}
                    isWholeDay={isWholeDay}
                    onWholeDayChange={setIsWholeDay}
                    minDate={minDate}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    onClose={() => setIsMobileCartOpen(false)}
                />
            </aside>

            <main className="flex-grow overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold dark:text-white">Resource Catalog</h1>
                    <button
                        onClick={() => setIsMobileCartOpen(true)}
                        className="lg:hidden relative p-2 bg-up-maroon-700 text-white rounded-full shadow-lg"
                    >
                        <ShoppingCartIcon className="w-6 h-6" />
                        {totalItemCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                                {totalItemCount}
                            </span>
                        )}
                    </button>
                </div>

                <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button onClick={() => setActiveTab('equipment')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'equipment' ? activeTabClasses : inactiveTabClasses}`}>
                            Equipment
                        </button>
                        <button onClick={() => setActiveTab('rooms')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'rooms' ? activeTabClasses : inactiveTabClasses}`}>
                            Rooms
                        </button>
                    </nav>
                </div>

                {activeTab === 'equipment' ? (
                    <EquipmentCatalog
                        inventory={equipmentInventory}
                        areas={areas}
                        isLoading={isLoading}
                        error={error}
                        onSelectInstances={handleSelectInstancesClick}
                        onViewDetailsClick={handleViewDetailsClick}
                    />
                ) : (
                    <RoomCatalog
                        roomTypes={roomInventory}
                        areas={areas}
                        isLoading={isLoading}
                        error={error}
                        onSelectInstances={handleSelectInstancesClick}
                        onViewDetailsClick={handleViewDetailsClick}
                        cartedInstanceIds={new Set(roomCart.keys())}
                    />
                )}
            </main>

            {viewingItem && (
                <ItemDetailsModal
                    item={viewingItem}
                    areaName={areas.find(a => a.id === viewingItem.areaId)?.name || 'N/A'}
                    onClose={() => setViewingItem(null)}
                    onSelectInstances={() => handleSelectInstancesClick(viewingItem)}
                    isInCart={activeTab === 'equipment' ? equipmentCart.has(viewingItem.id) : false}
                    startDate={startDate}
                    endDate={endDate}
                />
            )}

            {selectingInstancesFor && (
                <InstanceSelectionModal
                    item={selectingInstancesFor}
                    startDate={startDate}
                    endDate={endDate}
                    onClose={() => setSelectingInstancesFor(null)}
                    onConfirm={handleInstancesSelected}
                    alreadySelectedIds={new Set(
                        activeTab === 'equipment'
                            ? Array.from(equipmentCart.get(selectingInstancesFor.id)?.instances.keys() ?? [])
                            : roomCartEntries
                                .filter(entry => entry.type.id === selectingInstancesFor.id)
                                .map(entry => entry.instance.id)
                    )}
                />
            )}

            {isRequestModalOpen && (
                activeTab === 'equipment' ? (
                    <NewEquipmentRequestModal
                        areas={areas}
                        onClose={() => setIsRequestModalOpen(false)}
                        onSuccess={handleSuccessRequest}
                        items={new Map(
                            equipmentCartEntries.flatMap(group =>
                                Array.from(group.instances.values()).map(inst => [
                                    inst.id,
                                    { item: group.item, instance: inst }
                                ])
                            )
                        )}
                        startDate={startDate}
                        endDate={endDate}
                        minimumLeadDays={settings?.minimumLeadDays ?? 2}
                    />
                ) : (
                    roomCart.size > 0 && (
                        <NewRoomRequestModal
                            areas={areas}
                            onClose={() => setIsRequestModalOpen(false)}
                            onSuccess={handleSuccessRequest}
                            rooms={roomCart}
                            startDate={startDate}
                            endDate={endDate}
                            minimumLeadDays={settings?.minimumLeadDays ?? 2}
                        />
                    )
                )
            )}
        </div>
    );
};

export default CatalogPage;