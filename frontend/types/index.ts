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
