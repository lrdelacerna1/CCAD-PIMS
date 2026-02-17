import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { User } from "../types";
import { notificationService } from './notificationService';

export interface Appeal extends User {
  status: "pending" | "approved" | "rejected";
  userId: string; // Make sure this is defined
}

export const appealService = {
  createFacultyAppeal: async (
    userId: string,
    email: string,
    firstName: string,
    lastName: string
  ) => {
    try {
      // ✅ Auto-generate appeal doc ID — don't use userId as the doc ID
      const appealRef = doc(collection(db, "faculty_appeals"));
      await setDoc(appealRef, {
        userId,   // store Auth UID as a field only
        email,
        firstName,
        lastName,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      const superAdminIds = await notificationService.getSuperAdmins();
      await Promise.all(
        superAdminIds.map(adminId =>
          notificationService.createNotification(
            adminId,
            `${firstName} ${lastName} has submitted a faculty appeal request.`,
            '/superadmin',
            'New Faculty Appeal'
          )
        )
      );
    } catch (error) {
      console.error('Failed to create faculty appeal:', error);
      throw new Error('Failed to create faculty appeal.');
    }
  },

  getAllAppeals: async (): Promise<Appeal[]> => {
    try {
      const appealsCollection = collection(db, "faculty_appeals");
      const appealSnapshot = await getDocs(appealsCollection);
      const appeals: Appeal[] = [];
      appealSnapshot.forEach((doc) => {
        const data = doc.data();
        appeals.push({
          id: doc.id,
          userId: data.userId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          status: data.status,
          ...data
        } as Appeal);
      });
      return appeals;
    } catch (error) {
      console.error('Failed to get all appeals:', error);
      throw new Error('Failed to fetch appeals.');
    }
  },

  updateAppealStatus: async (
    appealId: string,
    userId: string,
    status: "approved" | "rejected"
  ) => {
    try {
      if (!userId) throw new Error('User ID is required to update appeal status.');
      if (!status) throw new Error('Status is required to update appeal.');

      // ✅ Fetch the appeal first to ensure userId is correct
      const appealRef = doc(db, "faculty_appeals", appealId);
      const appealSnap = await getDoc(appealRef); // add getDoc to imports

      if (!appealSnap.exists()) throw new Error(`Appeal ${appealId} not found.`);

      const appealData = appealSnap.data();
      const resolvedUserId = appealData.userId; // Always use the stored userId

      // ✅ Log to verify the correct user document is being targeted
      console.log(`Updating user document: users/${resolvedUserId}`);

      await updateDoc(appealRef, { status });

      const userRef = doc(db, "users", resolvedUserId);
      const userSnap = await getDoc(userRef);

      // ✅ Warn if user document doesn't exist
      if (!userSnap.exists()) {
        console.warn(`No user document found at users/${resolvedUserId}. A new one will be created.`);
      }

      if (status === "approved") {
        await setDoc(userRef, { role: "faculty" }, { merge: true });

        await notificationService.createNotification(
          resolvedUserId,
          'Your faculty appeal has been approved. You now have faculty access.',
          '/',
          'Faculty Appeal Approved'
        );
      } else if (status === "rejected") {
        await setDoc(userRef, { role: "guest" }, { merge: true });

        await notificationService.createNotification(
          resolvedUserId,
          'Your faculty appeal has been rejected. Please contact support for more information.',
          '/',
          'Faculty Appeal Rejected'
        );
      }

      console.log(`✅ Successfully updated users/${resolvedUserId} role to: ${status === "approved" ? "faculty" : "guest"}`);
    } catch (error) {
      console.error('Failed to update appeal status:', error);
      throw new Error('Failed to update appeal status.');
    }
  },

  deleteAppeal: async (appealId: string) => {
    try {
      const appealRef = doc(db, "faculty_appeals", appealId);
      await deleteDoc(appealRef);
    } catch (error) {
      console.error('Failed to delete appeal:', error);
      throw new Error('Failed to delete appeal.');
    }
  },
};