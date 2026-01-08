import { DailyAvailability, ItemDailyStatus } from '../../frontend/types';
import { CalendarService } from '../services/calendarService';

const simulateNetworkDelay = <T>(data: T): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data);
        }, 300);
    });
};

export const getMonthlyAvailabilityApi = async (
    year: number,
    month: number,
    areaId: string,
    resourceType: 'equipment' | 'rooms'
): Promise<DailyAvailability[]> => {
    const data = await CalendarService.getMonthlyAvailability(year, month, areaId, resourceType);
    return simulateNetworkDelay(data);
};

export const getDailyDetailedStatusApi = async (
    date: string,
    areaId: string,
    resourceType: 'equipment' | 'rooms'
): Promise<ItemDailyStatus[]> => {
    const data = await CalendarService.getDailyDetailedStatus(date, areaId, resourceType);
    return simulateNetworkDelay(data);
};