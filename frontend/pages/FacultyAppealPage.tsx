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
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to submit an appeal. Please sign in and try again.');
      return;
    }

    if (!file) {
      setError('Please upload a verification document before submitting.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('The selected file is too large. Please upload a file smaller than 5MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('The selected file type is not supported. Please upload a JPG, PNG, or PDF file.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const storage = getStorage();
      const fileExtension = file.name.split('.').pop();
      const fileName = `faculty-appeals/${user.id}/${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

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

      await updateProfile({ role: 'pending-faculty' });

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

      setIsSubmitted(true);
    } catch (err: any) {
      setError('Something went wrong while submitting your appeal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('The selected file is too large. Please upload a file smaller than 5MB.');
        setFile(null);
        e.target.value = '';
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('The selected file type is not supported. Please upload a JPG, PNG, or PDF file.');
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
          <p className="text-center text-slate-600 dark:text-slate-400">
            Please sign in to submit a faculty appeal.
          </p>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-lg mx-auto">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold dark:text-white mb-2">Appeal Submitted Successfully</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Your faculty appeal has been received. A super administrator will review your request and get back to you soon.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 mb-6 w-full">
              <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                ⏳ Status: Awaiting Approval
              </p>
            </div>
            <Button onClick={() => navigate('/')} className="w-full">
              Return to Dashboard
            </Button>
          </div>
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
            <label htmlFor="file" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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