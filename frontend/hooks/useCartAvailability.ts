import { useState, useEffect } from 'react';
import { InventoryItemForCatalog, RoomTypeForCatalog, InventoryInstance, RoomInstance } from '../types';
import { checkAvailabilityApi } from '../../backend/api/inventory';
import { checkRoomAvailabilityApi } from '../../backend/api/rooms';

type EquipmentCart = Map<string, { item: InventoryItemForCatalog, instances: Map<string, InventoryInstance> }>;
type RoomCart = { type: RoomTypeForCatalog, instance: RoomInstance } | null;
type Cart = EquipmentCart | RoomCart;
type ResourceType = 'equipment' | 'rooms';

export const useCartAvailability = (cart: Cart, startDate: string, endDate: string, type: ResourceType) => {
    const [availability, setAvailability] = useState<Map<string, boolean>>(new Map());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const getCartSize = () => {
            if (type === 'equipment' && cart instanceof Map) {
                return Array.from(cart.values()).reduce((sum, group) => sum + group.instances.size, 0);
            }
            if (type === 'rooms' && cart) {
                return 1;
            }
            return 0;
        };

        const cartSize = getCartSize();

        if (cartSize === 0 || !startDate || !endDate || new Date(endDate) < new Date(startDate)) {
            setAvailability(new Map());
            setIsLoading(false);
            return;
        }

        const handler = setTimeout(async () => {
            setIsLoading(true);
            const newAvailability = new Map<string, boolean>();

            try {
                if (type === 'equipment' && cart instanceof Map) {
                    const itemIds = Array.from(cart.keys());
                    if (itemIds.length === 0) {
                        setAvailability(new Map());
                        setIsLoading(false);
                        return;
                    }
                    const results = await checkAvailabilityApi({ startDate, endDate, itemIds });
                    const availableInstancesByItem = new Map(results.map(r => [r.itemId, new Set(r.availableInstances.map(i => i.id))]));

                    for (const group of cart.values()) {
                        for (const instance of group.instances.values()) {
                            const availableSet = availableInstancesByItem.get(instance.itemId);
                            newAvailability.set(instance.id, availableSet ? availableSet.has(instance.id) : false);
                        }
                    }

                } else if (type === 'rooms' && cart && 'instance' in cart) {
                    const roomTypeIds = [cart.type.id];
                    const results = await checkRoomAvailabilityApi({ startDate, endDate, roomTypeIds });
                    const availableInstancesByRoomType = new Map(results.map(r => [r.roomTypeId, new Set(r.availableInstances.map(i => i.id))]));
                    const availableSet = availableInstancesByRoomType.get(cart.type.id);
                    newAvailability.set(cart.instance.id, availableSet ? availableSet.has(cart.instance.id) : false);
                }
                setAvailability(newAvailability);
            } catch (error) {
                console.error("Failed to check cart availability:", error);
                if (type === 'equipment' && cart instanceof Map) {
                    for (const group of cart.values()) {
                        for (const instance of group.instances.values()) {
                            newAvailability.set(instance.id, false);
                        }
                    }
                } else if (type === 'rooms' && cart && 'instance' in cart) {
                    newAvailability.set(cart.instance.id, false);
                }
                setAvailability(newAvailability);
            } finally {
                setIsLoading(false);
            }
        }, 500); // 500ms debounce

        return () => {
            clearTimeout(handler);
        };
    }, [cart, startDate, endDate, type]);
    
    const getCartInstanceIds = () => {
        if (type === 'equipment' && cart instanceof Map) {
            return Array.from(cart.values()).flatMap(g => Array.from(g.instances.keys()));
        }
        if (type === 'rooms' && cart && 'instance' in cart) {
            return [cart.instance.id];
        }
        return [];
    };
    const allInstanceIdsInCart = getCartInstanceIds();
    const isCartSubmittable = allInstanceIdsInCart.length > 0 && !isLoading && allInstanceIdsInCart.every(id => availability.get(id) === true);

    return { availability, isLoading, isCartSubmittable };
};
