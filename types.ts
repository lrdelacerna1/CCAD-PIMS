export interface User {
  id: string;
  email: string;
  isVerified: boolean;
  role: 'user' | 'admin' | 'superadmin';
  firstName: string;
  lastName: string;
  contactNumber?: string;
  managedAreaIds?: string[];
}
