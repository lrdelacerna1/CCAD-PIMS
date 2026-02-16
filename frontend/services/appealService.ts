import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
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
      const appealRef = doc(db, "faculty_appeals", userId);
      await setDoc(appealRef, {
        userId,
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

  // Updated function signature to match the component usage
  updateAppealStatus: async (
    appealId: string,
    userId: string,
    status: "approved" | "rejected"
  ) => {
    try {
      if (!userId) {
        throw new Error('User ID is required to update appeal status.');
      }
      
      if (!status) {
        throw new Error('Status is required to update appeal.');
      }

      // Update the appeal document
      const appealRef = doc(db, "faculty_appeals", appealId);
      await updateDoc(appealRef, { status });

      // Update the user's role
      const userRef = doc(db, "users", userId);
      if (status === "approved") {
        await updateDoc(userRef, { role: "faculty" });
        
        await notificationService.createNotification(
          userId,
          'Your faculty appeal has been approved. You now have faculty access.',
          '/',
          'Faculty Appeal Approved'
        );
      } else if (status === "rejected") {
        await updateDoc(userRef, { role: "guest" });
        
        await notificationService.createNotification(
          userId,
          'Your faculty appeal has been rejected. Please contact support for more information.',
          '/',
          'Faculty Appeal Rejected'
        );
      }
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