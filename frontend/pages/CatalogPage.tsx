import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import EquipmentCatalog from '../components/catalog/EquipmentCatalog';
import RoomCatalog from '../components/catalog/RoomCatalog';
import NewEquipmentRequestModal from '../components/requests/NewEquipmentRequestModal';
import NewRoomRequestModal from '../components/requests/NewRoomRequestModal';
import ItemDetailsModal from '../components/catalog/ItemDetailsModal';
// FIX: Import ReservationSettings type.
import { Area, InventoryItemForCatalog, RoomTypeForCatalog, InventoryInstance, RoomInstance, ReservationSettings } from '../types';
import { getAreasApi } from '../../backend/api/areas';
import { Cart } from '../components/catalog/Cart';
import { useCartAvailability } from '../hooks/useCartAvailability';
import { ShoppingCartIcon } from '../components/Icons';
import InstanceSelectionModal from '../components/catalog/InstanceSelectionModal';
import { getInventoryCatalogApi } from '../../backend/api/inventory';
import { getRoomCatalogApi } from '../../backend/api/rooms';
// FIX: Import getSettingsApi to fetch system settings.
import { getSettingsApi } from '../../backend/api/settings';


const CatalogPage: React.FC = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'equipment' | 'rooms'>(
        (location.state as { activeTab?: 'equipment' | 'rooms' })?.activeTab || 'equipment'
    );
    const [areas, setAreas] = useState<Area[]>([]);
    
    // State for catalog data, now managed by this parent component
    const [equipmentInventory, setEquipmentInventory] = useState<InventoryItemForCatalog[]>([]);
    const [roomInventory, setRoomInventory] = useState<RoomTypeForCatalog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    // FIX: Add state for system settings.
    const [settings, setSettings] = useState<ReservationSettings | null>(null);

    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

    const [equipmentCart, setEquipmentCart] = useState<Map<string, { item: InventoryItemForCatalog, instances: Map<string, InventoryInstance> }>>(new Map());
    const [roomCart, setRoomCart] = useState<{ type: RoomTypeForCatalog, instance: RoomInstance } | null>(null);

    const activeCart = activeTab === 'equipment' ? equipmentCart : roomCart;
    const { availability, isLoading: isAvailabilityLoading, isCartSubmittable } = useCartAvailability(activeCart, startDate, endDate, activeTab);

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState<InventoryItemForCatalog | RoomTypeForCatalog | null>(null);
    const [selectingInstancesFor, setSelectingInstancesFor] = useState<InventoryItemForCatalog | RoomTypeForCatalog | null>(null);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // FIX: Fetch settings along with areas data.
            const [areasData, settingsData] = await Promise.all([
                getAreasApi(),
                getSettingsApi(),
            ]);
            setAreas(areasData);
            setSettings(settingsData);
            
            // Fetch catalog data based on active tab
            if (activeTab === 'equipment') {
                const inventoryData = await getInventoryCatalogApi(startDate, endDate);
                setEquipmentInventory(inventoryData);
            } else {
                const roomData = await getRoomCatalogApi(startDate, endDate);
                setRoomInventory(roomData);
            }
        } catch (err) {
            setError('Failed to load catalog data.');
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, activeTab]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (new Date(endDate) >= new Date(startDate)) {
                fetchData();
            } else {
                setEquipmentInventory([]);
                setRoomInventory([]);
                setError("End date cannot be before start date.");
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [fetchData, startDate, endDate]);
    
    useEffect(() => {
        setEquipmentCart(new Map());
        setRoomCart(null);
    }, [activeTab]);

    const totalItemCount = useMemo(() => {
        if (activeTab === 'equipment') {
            // FIX: Explicitly cast equipmentCart values to resolve 'unknown' property access errors.
            return (Array.from(equipmentCart.values()) as { item: InventoryItemForCatalog, instances: Map<string, InventoryInstance> }[]).reduce((sum: number, group) => sum + group.instances.size, 0);
        }
        return roomCart ? 1 : 0;
    }, [equipmentCart, roomCart, activeTab]);

    const handleInstancesSelected = (item: InventoryItemForCatalog | RoomTypeForCatalog, instances: (InventoryInstance | RoomInstance)[]) => {
        if (instances.length === 0) return;

        if ('serialNumber' in instances[0]) { // Equipment
            setEquipmentCart(prev => {
                const newCart = new Map(prev);
                // FIX: Explicitly cast the retrieved group from equipmentCart to avoid 'unknown' type error when accessing 'instances' property.
                const group = (newCart.get(item.id) as { item: InventoryItemForCatalog, instances: Map<string, InventoryInstance> } | undefined) || { item: item as InventoryItemForCatalog, instances: new Map() };
                (instances as InventoryInstance[]).forEach(inst => {
                    group.instances.set(inst.id, inst);
                });
                newCart.set(item.id, group);
                return newCart;
            });
        } else { // Room
            setRoomCart({ type: item as RoomTypeForCatalog, instance: instances[0] as RoomInstance });
        }
    };
    
    const handleRemoveFromCart = (itemId: string, instanceId?: string) => {
        if (activeTab === 'equipment') {
            setEquipmentCart(prev => {
                const newCart = new Map(prev);
                if (instanceId) {
                    // FIX: Explicitly cast the retrieved group to avoid 'unknown' type error when accessing properties.
                    const group = newCart.get(itemId) as { item: InventoryItemForCatalog, instances: Map<string, InventoryInstance> } | undefined;
                    if (group) {
                        group.instances.delete(instanceId);
                        if (group.instances.size === 0) {
                            newCart.delete(itemId);
                        }
                    }
                }
                return newCart;
            });
        } else {
            setRoomCart(null);
        }
    };

    const handleFinalizeRequest = () => {
        if (isCartSubmittable) {
            setIsRequestModalOpen(true);
            setIsMobileCartOpen(false);
        }
    };
    
    const handleCloseRequestModal = () => setIsRequestModalOpen(false);
    
    const handleSuccessRequest = () => {
        setIsRequestModalOpen(false);
        if (activeTab === 'equipment') setEquipmentCart(new Map());
        else setRoomCart(null);
        fetchData(); // This is the key change to refresh catalog availability
    };

    const handleViewDetailsClick = (item: InventoryItemForCatalog | RoomTypeForCatalog) => setViewingItem(item);
    
    const handleSelectInstancesClick = (item: InventoryItemForCatalog | RoomTypeForCatalog) => {
        setViewingItem(null);
        setSelectingInstancesFor(item);
    };


    const activeTabClasses = "border-b-2 border-up-maroon-700 text-up-maroon-700 dark:text-up-maroon-400 font-bold";
    const inactiveTabClasses = "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300";

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
            {/* Sidebar / Cart */}
            <aside className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 lg:relative lg:w-auto transition-transform duration-300 transform ${isMobileCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                <Cart
                    items={activeCart}
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
                    minDate={today}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    onClose={() => setIsMobileCartOpen(false)}
                />
            </aside>

            {/* Main Content */}
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
                        <button
                            onClick={() => setActiveTab('equipment')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'equipment' ? activeTabClasses : inactiveTabClasses}`}
                        >
                            Equipment
                        </button>
                        <button
                            onClick={() => setActiveTab('rooms')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'rooms' ? activeTabClasses : inactiveTabClasses}`}
                        >
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
                        isRoomInCart={!!roomCart}
                    />
                )}
            </main>

            {/* Modals */}
            {viewingItem && (
                <ItemDetailsModal
                    item={viewingItem}
                    areaName={areas.find(a => a.id === viewingItem.areaId)?.name || 'N/A'}
                    onClose={() => setViewingItem(null)}
                    onSelectInstances={() => handleSelectInstancesClick(viewingItem)}
                    isInCart={activeTab === 'equipment' ? equipmentCart.has(viewingItem.id) : !!roomCart}
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
                            ? (equipmentCart.get(selectingInstancesFor.id)?.instances.keys() || [])
                            : (roomCart?.instance.id ? [roomCart.instance.id] : [])
                    )}
                />
            )}

            {isRequestModalOpen && (
                activeTab === 'equipment' ? (
                    <NewEquipmentRequestModal
                        areas={areas}
                        onClose={handleCloseRequestModal}
                        onSuccess={handleSuccessRequest}
                        // FIX: Explicitly cast equipmentCart entries to resolve 'unknown' property access errors.
                        items={new Map((Array.from(equipmentCart.values()) as { item: InventoryItemForCatalog, instances: Map<string, InventoryInstance> }[]).flatMap(group => 
                            Array.from(group.instances.values()).map(inst => [inst.id, { item: group.item, instance: inst }])
                        ))}
                        startDate={startDate}
                        endDate={endDate}
                        minimumLeadDays={settings?.minimumLeadDays ?? 2}
                    />
                ) : (
                    roomCart && (
                        <NewRoomRequestModal
                            areas={areas}
                            onClose={handleCloseRequestModal}
                            onSuccess={handleSuccessRequest}
                            cartItem={roomCart}
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