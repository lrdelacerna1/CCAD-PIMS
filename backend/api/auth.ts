
import { User, UserRole } from '../../frontend/types';
import { AuthService } from '../services/authService';

const simulateNetworkDelay = <T>(data: T): Promise<T> => {
    return new Promise(resolve => setTimeout(() => resolve(data), 500));
};

export const loginUserApi = async (email: string, pass: string): Promise<User> => {
    const user = await AuthService.authenticate(email, pass);
    return simulateNetworkDelay(user);
};

export const signInWithGoogleApi = async (): Promise<User> => {
    const user = await AuthService.signInWithGoogle();
    return simulateNetworkDelay(user);
};

export const registerWithGoogleApi = async (): Promise<User> => {
    const user = await AuthService.registerWithGoogle();
    return simulateNetworkDelay(user);
};

export const registerUserApi = async (userData: {
    emailAddress: string;
    password?: string;
    firstName: string;
    lastName: string;
    contactNumber: string;
    studentId?: string;
    program?: string;
    role: UserRole;
}): Promise<User> => {
    const user = await AuthService.register(userData);
    return simulateNetworkDelay(user);
};

export const logoutUserApi = async (): Promise<void> => {
    await AuthService.logout();
    return simulateNetworkDelay(undefined);
};

export const sendVerificationEmailApi = async (): Promise<void> => {
    await AuthService.sendVerificationEmail();
    return simulateNetworkDelay(undefined);
};

export const getAllUsersApi = async (): Promise<User[]> => {
    const users = await AuthService.getAllUsers();
    return simulateNetworkDelay(users);
}

export const updateUserApi = async (userId: string, updates: Partial<User>): Promise<User> => {
    const user = await AuthService.updateUser(userId, updates);
    return simulateNetworkDelay(user);
};

export const updateUserManagedAreasApi = async (userId: string, areaIds: string[]): Promise<User> => {
    const user = await AuthService.updateUser(userId, { managedAreaIds: areaIds });
    return simulateNetworkDelay(user);
};

export const requestPasswordResetApi = async (email: string): Promise<void> => {
    await AuthService.requestPasswordReset(email);
    return simulateNetworkDelay(undefined);
};

export const validateResetTokenApi = async (token: string): Promise<boolean> => {
    const isValid = await AuthService.validateResetToken(token);
    return simulateNetworkDelay(isValid);
};

export const resetPasswordApi = async (token: string, newPass: string): Promise<void> => {
    await AuthService.resetPassword(token, newPass);
    return simulateNetworkDelay(undefined);
};
