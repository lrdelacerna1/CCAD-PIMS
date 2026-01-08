import React, { useState, forwardRef } from 'react';
import { EyeIcon, EyeSlashIcon } from '../Icons';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: React.ReactNode }>(
  ({ label, id, icon, type = 'text', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
      <div>
        {label && (
          <label htmlFor={id} className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500 dark:text-slate-400">
            {icon}
          </div>
          <input
            {...props}
            ref={ref}
            id={id}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            className="bg-slate-50 border border-slate-300 text-slate-900 sm:text-sm rounded-lg focus:ring-up-maroon-500 focus:border-up-maroon-500 block w-full p-2.5 pl-10 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-up-maroon-500 dark:focus:border-up-maroon-500"
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 dark:text-slate-400"
            >
              {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>
    );
  }
);
Input.displayName = 'Input';