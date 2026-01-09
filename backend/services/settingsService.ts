
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ReservationSettings } from "../../frontend/types";

const SETTINGS_DOC_ID = "reservation_settings";

export class SettingsService {
    static async getSettings(): Promise<ReservationSettings> {
        const settingsRef = doc(db, "settings", SETTINGS_DOC_ID);
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
            return settingsDoc.data() as ReservationSettings;
        } else {
            // Return default settings if the document doesn't exist
            return {
                minimumLeadDays: 2,
                penaltyAmount: 10,
                penaltyInterval: 'per_day',
            };
        }
    }
    
    static async updateSettings(newSettings: Partial<ReservationSettings>): Promise<ReservationSettings> {
        const settingsRef = doc(db, "settings", SETTINGS_DOC_ID);
        await setDoc(settingsRef, newSettings, { merge: true });
        return this.getSettings();
    }
}
