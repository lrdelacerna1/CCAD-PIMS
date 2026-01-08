import { User } from '../../frontend/types';
import { AuthService } from '../services/authService';

// This file simulates an API layer. In a real app, these functions
// would make HTTP requests (e.g., using fetch or axios) to a backend server.

const simulateNetworkDelay = <T>(data: T): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data);
        }, 500);
    });
};

export const loginUserApi = async (email: string, pass: string): Promise<User> => {
    const user = await AuthService.authenticate(email, pass);
    return simulateNetworkDelay(user);
};

export const loginWithGoogleApi = async (email?: string): Promise<User> => {
    const user = await AuthService.authenticateWithGoogle(email);
    return simulateNetworkDelay(user);
};

// FIX: Added optional contactNumber to the userData parameter.
export const registerUserApi = async (userData: {
    email: string;
    pass: string;
    firstName: string;
    lastName: string;
    contactNumber?: string;
}): Promise<User> => {
    const user = await AuthService.register(userData);
    return simulateNetworkDelay(user);
};

export const logoutUserApi = async (): Promise<void> => {
    await AuthService.logout();
    return simulateNetworkDelay(undefined);
};

export const verifyEmailApi = async (): Promise<User> => {
    const user = await AuthService.verifyCurrentUserEmail();
    return simulateNetworkDelay(user);
};

export const getAllUsersApi = async (): Promise<User[]> => {
    const users = await AuthService.getAllUsers();
    return simulateNetworkDelay(users);
}

export const updateUserManagedAreasApi = async (userId: string, areas: string[]): Promise<User> => {
    const user = await AuthService.updateUserManagedAreas(userId, areas);
    return simulateNetworkDelay(user);
};

export const updateProfileApi = async (userId: string, updates: {
    firstName: string;
    lastName: string;
    contactNumber: string;
}): Promise<User> => {
    const user = await AuthService.updateUserProfile(userId, updates);
    return simulateNetworkDelay(user);
};

export const requestPasswordResetApi = async (email: string): Promise<void> => {
    await AuthService.requestPasswordReset(email);
    return simulateNetworkDelay(undefined);
};

export const validateResetTokenApi = async (token: string): Promise<string> => {
    const userId = await AuthService.validateResetToken(token);
    return simulateNetworkDelay(userId);
};

export const resetPasswordApi = async (token: string, newPass: string): Promise<User> => {
    const user = await AuthService.resetPassword(token, newPass);
    return simulateNetworkDelay(user);
};