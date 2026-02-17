import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AuthLayout } from '../components/layout/AuthLayout';
import {
  MailIcon,
  LockIcon,
  UserIcon,
  GoogleIcon,
  PhoneIcon,
  AcademicCapIcon,
  BriefcaseIcon,
} from '../components/Icons';
import { UserRole } from '../types';
import { Select } from '../components/ui/Select';
import RoleSelectionModal from '../components/auth/RoleSelectionModal';
import { appealService } from '../services/appealService';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, signUpWithGoogle, updateProfile, user } = useAuth();

  const [userType, setUserType] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [studentId, setStudentId] = useState('');
  const [program, setProgram] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [showPendingNotification, setShowPendingNotification] = useState(false);

  // Stores the raw Firebase user returned from signUpWithGoogle
  // before the auth context has a chance to hydrate — avoids race condition
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any>(null);

  // ─── Email/password registration ────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (
      (userType === 'student' || userType === 'faculty') &&
      !email.endsWith('@up.edu.ph')
    ) {
      setError('Invalid UP Mail address. Please use your @up.edu.ph email.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      let userData: any = {
        emailAddress: email,
        password,
        firstName,
        lastName,
        contactNumber,
        role: userType,
      };

      if (userType === 'student') {
        userData = { ...userData, studentId, program };
      }

      await register(userData);
      navigate('/verify-email');
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Google sign-up ──────────────────────────────────────────────────────────

  const handleGoogleSignUp = async () => {
    if (isGoogleLoading) return;
    setError('');
    setIsGoogleLoading(true);

    try {
      const firebaseUser = await signUpWithGoogle();
      if (!firebaseUser) return; // user closed the popup

      if (firebaseUser.email?.endsWith('@up.edu.ph')) {
        // Store the raw Firebase user NOW — before auth context hydrates
        setPendingGoogleUser(firebaseUser);
        setIsRoleModalOpen(true);
      } else {
        // Guest role is already set inside signUpWithGoogle — just navigate
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // ─── Role selection (Google flow only) ───────────────────────────────────────

  const handleRoleSelection = async (role: 'student' | 'faculty') => {
    setIsRoleModalOpen(false);

    // ✅ Always use the raw Firebase UID from pendingGoogleUser — 
    // this is the true Auth UID and must match the Firestore users/{uid} doc.
    // Never trust resolvedUser.id here as the auth context may be stale.
    const authUid = pendingGoogleUser?.uid;
    const authEmail = pendingGoogleUser?.email ?? '';
    const authFirstName = pendingGoogleUser?.displayName?.split(' ')[0] ?? '';
    const authLastName = pendingGoogleUser?.displayName?.split(' ').slice(1).join(' ') ?? '';

    if (!authUid) {
      setError('User session lost. Please try signing up again.');
      return;
    }

    try {
      if (role === 'student') {
        await updateProfile({ role: 'student' });
        navigate('/');
      } else {
        await appealService.createFacultyAppeal(
          authUid,        // ✅ Guaranteed Firebase Auth UID
          authEmail,
          authFirstName,
          authLastName
        );
        await updateProfile({ role: 'pending-faculty' });
        setShowPendingNotification(true);
      }
    } catch (err: any) {
      console.error('Role selection failed:', err);
      setError('Failed to update role. Please try again.');
    }
  };

  const handlePendingNotificationClose = () => {
    setShowPendingNotification(false);
    navigate('/');
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <AuthLayout>
      <RoleSelectionModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onSelectRole={handleRoleSelection}
      />

      {/* Pending Faculty Notification Modal */}
      {showPendingNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-amber-600 dark:text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Faculty Access Pending
              </h3>

              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your faculty appeal has been submitted successfully. You are
                currently a <strong>pending faculty</strong> member. A super
                administrator will review and approve your request soon.
              </p>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 mb-6 w-full">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                  ⏳ Status: Awaiting Approval
                </p>
              </div>

              <Button onClick={handlePendingNotificationClose} className="w-full">
                Continue to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="w-full sm:max-w-xl">
        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white font-heading text-center mb-4">
          Create a New Account
        </h1>

        {/* User Type Selection */}
        <div className="flex justify-center gap-4 mb-6">
          {(
            [
              { type: 'student', label: 'Student', Icon: AcademicCapIcon },
              { type: 'guest', label: 'Guest', Icon: UserIcon },
              { type: 'faculty', label: 'Faculty', Icon: BriefcaseIcon },
            ] as const
          ).map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => setUserType(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${userType === type
                  ? 'bg-ccad-red text-white'
                  : 'bg-slate-200 dark:bg-slate-700'
                }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              icon={<UserIcon className="w-5 h-5" />}
            />
            <Input
              label="Last Name"
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              icon={<UserIcon className="w-5 h-5" />}
            />
          </div>

          <Input
            label={userType === 'guest' ? 'Email Address' : 'UP Mail Address'}
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={<MailIcon className="w-5 h-5" />}
          />

          {/* Student-specific fields */}
          {userType === 'student' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Student ID"
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                icon={<UserIcon className="w-5 h-5" />}
              />
              <Select
                label="Program"
                id="program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                required
                icon={<AcademicCapIcon className="w-5 h-5" />}
              >
                <option value="" disabled>Select a program</option>
                <optgroup label="Arts and Humanities">
                  <option value="Certificate in Fine Arts (Studio Arts)">Certificate in Fine Arts (Studio Arts)</option>
                  <option value="Certificate in Fine Arts (Product Design)">Certificate in Fine Arts (Product Design)</option>
                  <option value="Bachelor of Fine Arts (Studio Arts)">Bachelor of Fine Arts (Studio Arts)</option>
                  <option value="Bachelor of Fine Arts (Product Design)">Bachelor of Fine Arts (Product Design)</option>
                  <option value="Bachelor of Arts (Mass Communication)">Bachelor of Arts (Mass Communication)</option>
                </optgroup>
                <optgroup label="Business Management">
                  <option value="Master of Business Administration">Master of Business Administration</option>
                  <option value="Bachelor of Science in Management">Bachelor of Science in Management</option>
                </optgroup>
                <optgroup label="Sciences">
                  <option value="Master of Science in Computer Science">Master of Science in Computer Science</option>
                  <option value="Master of Science in Environmental Studies">Master of Science in Environmental Studies</option>
                  <option value="Bachelor of Science in Biology">Bachelor of Science in Biology</option>
                  <option value="Bachelor of Science in Computer Science">Bachelor of Science in Computer Science</option>
                  <option value="Bachelor of Science in Mathematics">Bachelor of Science in Mathematics</option>
                </optgroup>
                <optgroup label="Social Sciences">
                  <option value="Master of Education">Master of Education</option>
                  <option value="Bachelor of Arts in Political Science">Bachelor of Arts in Political Science</option>
                  <option value="Bachelor of Arts in Psychology">Bachelor of Arts in Psychology</option>
                </optgroup>
                <optgroup label="High School">
                  <option value="High School">High School</option>
                </optgroup>
              </Select>
            </div>
          )}

          <Input
            label="Contact Number"
            id="contactNumber"
            type="tel"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            icon={<PhoneIcon className="w-5 h-5" />}
            pattern="[0-9]*"
            title="Please enter numbers only"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={<LockIcon className="w-5 h-5" />}
            />
            <Input
              label="Confirm password"
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              icon={<LockIcon className="w-5 h-5" />}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
          )}

          <div className="pt-2">
            <Button type="submit" isLoading={isLoading} className="w-full">
              Create account
            </Button>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-300 dark:border-slate-600" />
            <span className="flex-shrink mx-4 text-sm text-slate-500 dark:text-slate-400">
              or
            </span>
            <div className="flex-grow border-t border-slate-300 dark:border-slate-600" />
          </div>

          <Button
            variant="secondary"
            type="button"
            disabled={isGoogleLoading}
            onClick={handleGoogleSignUp}
            className="w-full"
          >
            {isGoogleLoading ? (
              <svg
                className="animate-spin -ml-1 mr-3 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <GoogleIcon className="w-4 h-4 mr-2" />
            )}
            Sign up with Google
          </Button>

          <p className="text-sm font-light text-slate-500 dark:text-slate-400 text-center">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-ccad-red hover:underline dark:text-ccad-red-light"
            >
              Login here
            </Link>
          </p>
        </form>
      </Card>
    </AuthLayout>
  );
};

export default RegisterPage;