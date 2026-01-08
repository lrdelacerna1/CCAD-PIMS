import { ReservationSettings } from '../../frontend/types';
import { SettingsService } from '../services/settingsService';

const simulateNetworkDelay = <T>(data: T): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data);
        }, 300);
    });
};

export const getSettingsApi = async (): Promise<ReservationSettings> => {
    const settings = await SettingsService.getSettings();
    return simulateNetworkDelay(settings);
};

export const updateSettingsApi = async (newSettings: Partial<ReservationSettings>): Promise<ReservationSettings> => {
    const updatedSettings = await SettingsService.updateSettings(newSettings);
    return simulateNetworkDelay(updatedSettings);
};