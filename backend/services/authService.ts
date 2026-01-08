import { User } from '../../frontend/types';
import { users, passwords, passwordResetTokens, saveUsersAndPasswords } from '../db/mockDb';

const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

export class AuthService {
  static async authenticate(email: string, pass: string): Promise<User> {
    const user = users.find(u => u.email === email);
    if (!user || passwords.get(email) !== pass) {
      throw new Error('Invalid email or password');
    }
    localStorage.setItem('user', JSON.stringify(user));
    return { ...user };
  }

  /**
   * Simulates Google Authentication with a specific account selection
   */
  static async authenticateWithGoogle(selectedEmail?: string): Promise<User> {
    // In a real app, this would be the result of a successful OAuth callback
    const googleUserEmail = selectedEmail || "google-user@example.com";
    let user = users.find(u => u.email === googleUserEmail);

    if (!user) {
      // Create a new user if they don't exist (Simulation of first-time Google Sign-in)
      const nameParts = googleUserEmail.split('@')[0].split('.');
      const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
      const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : "GoogleUser";

      user = {
        id: uuidv4(),
        email: googleUserEmail,
        firstName: firstName,
        lastName: lastName,
        isVerified: true, // Google accounts are pre-verified
        role: googleUserEmail.includes('admin') ? 'admin' : 'user',
        contactNumber: ''
      };
      users.push(user);
      passwords.set(googleUserEmail, 'google-oauth-managed');
      saveUsersAndPasswords();
    }

    localStorage.setItem('user', JSON.stringify(user));
    return { ...user };
  }

  static async register(userData: {
    email: string;
    pass: string;
    firstName: string;
    lastName: string;
    contactNumber?: string;
  }): Promise<User> {
    if (users.some(u => u.email === userData.email)) {
      throw new Error('User with this email already exists');
    }
    const newUser: User = {
      id: uuidv4(),
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      contactNumber: userData.contactNumber || '',
      isVerified: false,
      role: 'user',
    };
    users.push(newUser);
    passwords.set(userData.email, userData.pass);
    saveUsersAndPasswords(); // Persist changes
    localStorage.setItem('user', JSON.stringify(newUser));
    return { ...newUser };
  }

  static async logout(): Promise<void> {
    localStorage.removeItem('user');
  }

  static async verifyCurrentUserEmail(): Promise<User> {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
          throw new Error('No user is currently logged in.');
      }
      
      const loggedInUser: User = JSON.parse(storedUser);
      const userInDb = users.find(u => u.id === loggedInUser.id);
      
      if (!userInDb) {
          throw new Error('User not found.');
      }

      userInDb.isVerified = true;
      saveUsersAndPasswords(); // Persist changes
      localStorage.setItem('user', JSON.stringify(userInDb));
      return { ...userInDb };
  }
  
  static async getAllUsers(): Promise<User[]> {
      return JSON.parse(JSON.stringify(users));
  }

  static async updateUserManagedAreas(userId: string, areaIds: string[]): Promise<User> {
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
          throw new Error('User not found');
      }
      users[userIndex].managedAreaIds = areaIds;
      
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
          const loggedInUser: User = JSON.parse(storedUser);
          if (loggedInUser.id === userId) {
              localStorage.setItem('user', JSON.stringify(users[userIndex]));
          }
      }
      saveUsersAndPasswords(); // Persist changes
      return { ...users[userIndex] };
  }

  static async updateUserProfile(userId: string, updates: {
    firstName: string;
    lastName: string;
    contactNumber: string;
  }): Promise<User> {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    users[userIndex] = {
      ...users[userIndex],
      firstName: updates.firstName,
      lastName: updates.lastName,
      contactNumber: updates.contactNumber,
    };

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const loggedInUser: User = JSON.parse(storedUser);
      if (loggedInUser.id === userId) {
        localStorage.setItem('user', JSON.stringify(users[userIndex]));
      }
    }
    saveUsersAndPasswords(); // Persist changes
    return { ...users[userIndex] };
  }

  static async requestPasswordReset(email: string): Promise<void> {
    const user = users.find(u => u.email === email);
    if (user) {
        const token = uuidv4();
        const expires = Date.now() + 3600000; // 1 hour from now
        passwordResetTokens.set(token, { userId: user.id, expires });

        // In a real app, you'd email this link. We'll log it for the mock.
        console.log(`Password reset link: /#/reset-password?token=${token}`);
    }
    // We don't throw an error for non-existent users to prevent email enumeration.
  }

  static async validateResetToken(token: string): Promise<string> {
    const tokenData = passwordResetTokens.get(token);
    if (!tokenData) {
        throw new Error('Invalid or expired password reset token.');
    }
    if (tokenData.expires < Date.now()) {
        passwordResetTokens.delete(token); // Clean up expired token
        throw new Error('Invalid or expired password reset token.');
    }
    return tokenData.userId;
  }

  static async resetPassword(token: string, newPass: string): Promise<User> {
    const userId = await this.validateResetToken(token);
    const user = users.find(u => u.id === userId);
    if (!user) {
        // This should not happen if token is valid, but good to check.
        throw new Error('User not found.');
    }
    passwords.set(user.email, newPass);
    passwordResetTokens.delete(token); // Invalidate token after use
    saveUsersAndPasswords(); // Persist changes
    return { ...user };
  }
}