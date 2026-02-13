
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { SystemSettings } from "../../frontend/types";

const settingsDocRef = doc(db, "settings", "main");

export const SettingsService = {
    async getSettings(): Promise<SystemSettings> {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            return docSnap.data() as SystemSettings;
        } else {
            // If no settings exist, create with default values
            const defaultSettings: SystemSettings = {
                penaltyAmount: 50,
                penaltyInterval: 'daily',
                // Add other default settings here
            };
            await setDoc(settingsDocRef, defaultSettings);
            return defaultSettings;
        }
    },

    async updateSettings(settings: Partial<SystemSettings>): Promise<void> {
        await updateDoc(settingsDocRef, settings);
    }
};
