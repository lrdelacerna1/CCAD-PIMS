import { ReservationSettings } from '../../frontend/types';
import { reservationSettings, saveSettings } from '../db/mockDb';

export class SettingsService {
    static async getSettings(): Promise<ReservationSettings> {
        return JSON.parse(JSON.stringify(reservationSettings));
    }
    
    static async updateSettings(newSettings: Partial<ReservationSettings>): Promise<ReservationSettings> {
        // In a real DB, you'd have validation here
        if (newSettings.minimumLeadDays !== undefined) {
            reservationSettings.minimumLeadDays = Math.max(0, newSettings.minimumLeadDays); // Ensure it's not negative
        }
        if (newSettings.penaltyAmount !== undefined) {
            reservationSettings.penaltyAmount = Math.max(0, newSettings.penaltyAmount);
        }
        if (newSettings.penaltyInterval !== undefined) {
            reservationSettings.penaltyInterval = newSettings.penaltyInterval;
        }
        
        saveSettings();
        return { ...reservationSettings };
    }
}