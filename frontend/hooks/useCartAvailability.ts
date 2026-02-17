import { useState, useEffect, useMemo } from 'react';
import { InventoryItemForCatalog, RoomTypeForCatalog, InventoryInstance, RoomInstance, EquipmentCart, RoomCart } from '../types';
import { checkAvailabilityApi } from '../../backend/api/inventory';
import { checkRoomAvailabilityApi } from '../../backend/api/rooms';

type Cart = EquipmentCart | RoomCart;
type ResourceType = 'equipment' | 'rooms';

export const useCartAvailability = (cart: Cart, startDate: string, endDate: string, type: ResourceType) => {
    const [availability, setAvailability] = useState<Map<string, boolean>>(new Map());
    const [isLoading, setIsLoading] = useState(false);

    const cartSize = useMemo(() => {
        if (type === 'equipment') {
            return Array.from((cart as EquipmentCart).values()).reduce((sum, group) => sum + group.instances.size, 0);
        }
        return (cart as RoomCart).size;
    }, [cart, type]);

    useEffect(() => {
        if (cartSize === 0 || !startDate || !endDate || new Date(endDate) < new Date(startDate)) {
            setAvailability(new Map());
            setIsLoading(false);
            return;
        }

        const handler = setTimeout(async () => {
            setIsLoading(true);
            const newAvailability = new Map<string, boolean>();

            try {
                if (type === 'equipment' && cart.size > 0) {
                    const itemIds = Array.from((cart as EquipmentCart).keys());
                    const results = await checkAvailabilityApi({ startDate, endDate, itemIds });
                    const availableInstancesByItem = new Map(results.map(r => [r.itemId, new Set(r.availableInstances.map(i => i.id))]));

                    for (const group of (cart as EquipmentCart).values()) {
                        for (const instance of group.instances.values()) {
                            const availableSet = availableInstancesByItem.get(instance.itemId);
                            newAvailability.set(instance.id, !!availableSet?.has(instance.id));
                        }
                    }

                } else if (type === 'rooms' && cart.size > 0) {
                    const roomTypeIds = [...new Set(Array.from((cart as RoomCart).values()).map(item => item.type.id))];
                    const results = await checkRoomAvailabilityApi({ startDate, endDate, roomTypeIds });
                    const availableInstancesByRoomType = new Map(results.map(r => [r.roomTypeId, new Set(r.availableInstances.map(i => i.id))]));
                    
                    for (const roomItem of (cart as RoomCart).values()) {
                        const availableSet = availableInstancesByRoomType.get(roomItem.type.id);
                        newAvailability.set(roomItem.instance.id, !!availableSet?.has(roomItem.instance.id));
                    }
                }
                setAvailability(newAvailability);
            } catch (error) {
                console.error("Failed to check cart availability:", error);
                const instanceIds = Array.from(cart.values()).flatMap((item: any) => 
                    item.instances ? Array.from<any>(item.instances.keys()) : [item.instance.id]
                );
                instanceIds.forEach(id => newAvailability.set(id, false));
                setAvailability(newAvailability);
            } finally {
                setIsLoading(false);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [cart, startDate, endDate, type, cartSize]);
    
    const isCartSubmittable = useMemo(() => {
        if (cartSize === 0 || isLoading) return false;
        
        // Ensure availability has been computed for all items in the cart
        if (availability.size !== cartSize) return false;

        return Array.from(availability.values()).every(isAvailable => isAvailable);
    }, [cartSize, isLoading, availability]);

    return { availability, isLoading, isCartSubmittable };
};
