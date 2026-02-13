
import { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    writeBatch,
    getDoc
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Area } from "../../frontend/types";

const areasCollection = collection(db, "areas");
const usersCollection = collection(db, "users");

export class AreaService {
    static async getAreas(): Promise<Area[]> {
        const querySnapshot = await getDocs(areasCollection);
        const areas: Area[] = [];
        querySnapshot.forEach(doc => {
            areas.push({ id: doc.id, ...doc.data() } as Area);
        });
        return areas;
    }

    static async getAreaById(id: string): Promise<Area> {
        const areaRef = doc(db, "areas", id);
        const docSnap = await getDoc(areaRef);
        if (!docSnap.exists()) {
            throw new Error("Area not found");
        }
        return { id: docSnap.id, ...docSnap.data() } as Area;
    }

    static async createArea(name: string): Promise<Area> {
        const q = query(areasCollection, where("name", "==", name));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error(`Area with name "${name}" already exists.`);
        }

        const newArea: Omit<Area, 'id'> = {
            name,
            description: '',
            penaltySettings: { penaltyAmount: 0, penaltyInterval: 'per_day' },
        };

        const docRef = await addDoc(areasCollection, newArea);
        return { id: docRef.id, ...newArea };
    }

    static async updateArea(id: string, areaData: Partial<Area>): Promise<Area> {
        const areaRef = doc(db, "areas", id);

        // Check for name collision before updating
        if (areaData.name) {
            const q = query(areasCollection, where("name", "==", areaData.name));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                throw new Error(`Area with name "${areaData.name}" already exists.`);
            }
        }

        await updateDoc(areaRef, areaData);
        return { id, ...areaData } as Area;
    }

    static async deleteArea(id: string): Promise<void> {
        const areaRef = doc(db, "areas", id);
        await deleteDoc(areaRef);

        // Remove the deleted areaId from any users who manage it
        const batch = writeBatch(db);
        const q = query(usersCollection, where("managedAreaIds", "array-contains", id));
        const usersSnapshot = await getDocs(q);
        
        usersSnapshot.forEach(userDoc => {
            const currentManagedAreaIds = userDoc.data().managedAreaIds || [];
            const updatedManagedAreaIds = currentManagedAreaIds.filter((areaId: string) => areaId !== id);
            batch.update(userDoc.ref, { managedAreaIds: updatedManagedAreaIds });
        });

        await batch.commit();
    }
}
