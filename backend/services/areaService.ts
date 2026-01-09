
import { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    writeBatch 
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

    static async createArea(name: string): Promise<Area> {
        const q = query(areasCollection, where("name", "==", name));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error(`Area with name "${name}" already exists.`);
        }

        const docRef = await addDoc(areasCollection, { name });
        return { id: docRef.id, name };
    }

    static async updateArea(id: string, name: string): Promise<Area> {
        const areaRef = doc(db, "areas", id);

        // Check for name collision before updating
        const q = query(areasCollection, where("name", "==", name));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            throw new Error(`Area with name "${name}" already exists.`);
        }

        await updateDoc(areaRef, { name });
        return { id, name };
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
