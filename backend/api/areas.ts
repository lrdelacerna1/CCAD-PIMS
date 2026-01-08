import { Area } from '../../frontend/types';
import { AreaService } from '../services/areaService';

const simulateNetworkDelay = <T>(data: T): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data);
        }, 300); // Shorter delay for quicker UI updates
    });
};

export const getAreasApi = async (): Promise<Area[]> => {
    const areas = await AreaService.getAreas();
    return simulateNetworkDelay(areas);
};

export const createAreaApi = async (name: string): Promise<Area> => {
    const newArea = await AreaService.createArea(name);
    return simulateNetworkDelay(newArea);
};

export const updateAreaApi = async (id: string, name: string): Promise<Area> => {
    const updatedArea = await AreaService.updateArea(id, name);
    return simulateNetworkDelay(updatedArea);
};

export const deleteAreaApi = async (id: string): Promise<void> => {
    await AreaService.deleteArea(id);
    return simulateNetworkDelay(undefined);
};
