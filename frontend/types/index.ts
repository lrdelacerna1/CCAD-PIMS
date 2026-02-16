export type UserRole = 'student' | 'faculty' | 'guest' | 'superadmin' | 'pending-faculty';

export interface User {
  id: string;
  emailAddress: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  contactNumber?: string;
  studentId?: string;
  program?: string;
}

export interface Appeal {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string; // The user who should receive the notification
  message: string;
  isRead: boolean;
  createdAt: Date;
  link?: string; // Optional link to navigate to
}

// Re-export from firestore.ts, carefully to avoid conflicts
export type { Area } from './firestore';

// Added missing types
export interface InventoryInstance {
  id: string;
  assetTag: string;
  status: string;
  serialNumber: string;
}

export interface RoomInstance {
  id: string;
  roomNumber: string;
  status: string;
}

export type AvailabilityStatus = 'Available' | 'Partially Available' | 'Unavailable' | 'Error';

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  images: string[];
  areaId: string;
  totalInstances: number;
  availableInstances: number;
  availabilityStatus: AvailabilityStatus;
}

export interface InventoryItemForCatalog extends CatalogItem {}

export interface RoomTypeForCatalog extends CatalogItem {
  capacity: number;
}

export interface ReservationSettings {
  minimumLeadDays: number;
  maxBookingDays: number;
}
