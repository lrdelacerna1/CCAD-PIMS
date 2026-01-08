import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { 
  loginUserApi, 
  registerUserApi, 
  logoutUserApi,
  verifyEmailApi,
  updateProfileApi,
  loginWithGoogleApi
} from '../../backend/api/auth';
import { getAreasApi } from '../../backend/api/areas';

// Define the shape of the context data
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: (email?: string) => Promise<void>;
  logout: () => void;
  // FIX: Added optional contactNumber to the userData parameter type.
  register: (userData: { 
    email: string; 
    pass: string;
    firstName: string;
    lastName: string;
    contactNumber?: string;
   }) => Promise<void>;
  verifyEmail: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  updateProfile: (updates: {
    firstName: string;
    lastName: string;
    contactNumber: string;
  }) => Promise<void>;
}

// Create the context with a default undefined value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the provider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for a logged-in user on initial load
  useEffect(() => {
    const checkAndSetUser = async () => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            let userToSet: User = JSON.parse(storedUser);

            // FIX: Sanitize managedAreaIds on load to fix data corruption from a previous bug.
            // This ensures that the array only contains valid area IDs, not area names.
            if ((userToSet.role === 'admin' || userToSet.role === 'superadmin') && Array.isArray(userToSet.managedAreaIds)) {
                try {
                    const allAreas = await getAreasApi();
                    const validAreaIds = new Set(allAreas.map(a => a.id));
                    const sanitizedIds = userToSet.managedAreaIds.filter(id => validAreaIds.has(id));

                    if (sanitizedIds.length !== userToSet.managedAreaIds.length) {
                        userToSet.managedAreaIds = sanitizedIds;
                        localStorage.setItem('user', JSON.stringify(userToSet));
                    }
                } catch (error) {
                    console.error("Failed to fetch areas for user data sanitization:", error);
                }
            }

            setUser(userToSet);
        }
        setIsLoading(false);
    };

    checkAndSetUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const loggedInUser = await loginUserApi(email, pass);
    setUser(loggedInUser);
  };

  const loginWithGoogle = async (email?: string) => {
    const loggedInUser = await loginWithGoogleApi(email);
    setUser(loggedInUser);
  };

  // FIX: Added optional contactNumber to the userData parameter type.
  const register = async (userData: { 
    email: string; 
    pass: string;
    firstName: string;
    lastName: string;
    contactNumber?: string;
  }) => {
    const newUser = await registerUserApi(userData);
    setUser(newUser);
  };
  
  const logout = async () => {
    await logoutUserApi();
    setUser(null);
  };
  
  const verifyEmail = async () => {
    const updatedUser = await verifyEmailApi();
    setUser(updatedUser);
  };

  const updateProfile = async (updates: {
    firstName: string;
    lastName: string;
    contactNumber: string;
  }) => {
    if (!user) {
      throw new Error('You must be logged in to update your profile.');
    }
    const updatedUser = await updateProfileApi(user.id, updates);
    setUser(updatedUser);
  };

  const value = {
    user,
    isLoading,
    login,
    loginWithGoogle,
    logout,
    register,
    verifyEmail,
    setUser,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};