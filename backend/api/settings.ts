
import { SettingsService } from '../services/settingsService';
import { SystemSettings } from '../../frontend/types';

export const getSettingsApi = async (): Promise<SystemSettings> => {
    return await SettingsService.getSettings();
};

export const updateSettingsApi = async (settings: Partial<SystemSettings>): Promise<void> => {
    return await SettingsService.updateSettings(settings);
};
