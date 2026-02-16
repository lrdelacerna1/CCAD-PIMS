import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { useNavigate } from 'react-router-dom';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { notificationService } from '../services/notificationService';

const FacultyAppealPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [department, setDepartment] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit an appeal.');
      return;
    }

    if (!file) {
      setError('Please upload a verification document.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG, PNG, and PDF files are allowed.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Upload file to Firebase Storage
      const storage = getStorage();
      const fileExtension = file.name.split('.').pop();
      const fileName = `faculty-appeals/${user.id}/${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // Create appeal document in Firestore
      const appealRef = doc(db, 'faculty_appeals', user.id);
      await setDoc(appealRef, {
        userId: user.id,
        email: user.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        department,
        message,
        fileUrl,
        fileName: file.name,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Update user role to pending-faculty
      await updateProfile({ role: 'pending-faculty' });

      // Notify super admins
      const superAdminIds = await notificationService.getSuperAdmins();
      await Promise.all(
        superAdminIds.map(adminId =>
          notificationService.createNotification(
            adminId,
            `${user.firstName} ${user.lastName} has submitted a faculty appeal request.`,
            '/superadmin',
            'New Faculty Appeal'
          )
        )
      );

      alert('Your faculty appeal has been submitted successfully!');
      navigate('/');
    } catch (err: any) {
      console.error('Error submitting appeal:', err);
      setError(err.message || 'An error occurred while submitting the appeal.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (selectedFile) {
      // Validate file size immediately
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB.');
        setFile(null);
        e.target.value = '';
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only JPG, PNG, and PDF files are allowed.');
        setFile(null);
        e.target.value = '';
        return;
      }

      setError('');
      setFile(selectedFile);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-lg mx-auto">
          <p className="text-center text-red-500">You must be logged in to submit an appeal.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-center mb-2 dark:text-white">Faculty Appeal</h1>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-6">
          Please provide the following information to verify your faculty status.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Department"
            id="department"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g., Computer Science, Mathematics"
            required
          />
          <Textarea
            label="Message"
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Explain why you need faculty access..."
            rows={4}
            required
          />
          <div>
            <label 
              htmlFor="file" 
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Upload ID or Verification Document <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Accepted formats: JPG, PNG, PDF (Max 5MB)
            </p>
            <input
              id="file"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              required
              className="mt-1 block w-full text-sm text-slate-500 dark:text-slate-400
                file:mr-4 file:py-2 file:px-4 
                file:rounded-lg file:border-0 
                file:text-sm file:font-semibold 
                file:bg-ccad-red file:text-white 
                hover:file:bg-ccad-red-dark
                cursor-pointer
                border border-slate-300 dark:border-slate-600 
                rounded-lg
                dark:bg-slate-700"
            />
            {file && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
            </div>
          )}
          <Button type="submit" isLoading={isLoading} className="w-full">
            Submit Appeal
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default FacultyAppealPage;