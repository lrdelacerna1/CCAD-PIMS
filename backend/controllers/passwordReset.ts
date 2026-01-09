import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/db';

// In a real application, you would use a library like nodemailer to send emails
// For this example, we'll just log the reset token to the console

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await db('users').where({ email }).first();

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

  // In a real application, you would save the resetToken and resetExpires to the user's record in the database

  console.log(`Password reset token for ${email}: ${resetToken}`);

  res.json({ message: 'Password reset email sent' });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  // In a real application, you would find the user by the resetToken and check if the token has expired
  // Then, you would hash the new password and update the user's record

  console.log(`Resetting password with token: ${token} and new password: ${password}`)

  res.json({ message: 'Password has been reset' });
};