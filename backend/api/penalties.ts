import { Penalty } from '../../frontend/types';
import { PenaltyService } from '../services/penaltyService';

const simulateNetworkDelay = <T>(data: T): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data);
        }, 200);
    });
};

export const getPenaltiesByUserIdApi = async (userId: string): Promise<Penalty[]> => {
    const data = await PenaltyService.getPenaltiesByUserId(userId);
    return simulateNetworkDelay(data);
};

export const getAllPenaltiesApi = async (): Promise<Penalty[]> => {
    const data = await PenaltyService.getAllPenalties();
    return simulateNetworkDelay(data);
};

export const markPenaltyAsPaidApi = async (penaltyId: string): Promise<void> => {
    await PenaltyService.markPenaltyAsPaid(penaltyId);
    return simulateNetworkDelay(undefined);
};