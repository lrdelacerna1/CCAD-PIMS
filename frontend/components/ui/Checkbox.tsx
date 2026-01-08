import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, ...props }, ref) => (
    <div className="flex items-start">
      <input
        id={id}
        ref={ref}
        type="checkbox"
        {...props}
        className="w-4 h-4 text-up-maroon-700 bg-gray-100 border-gray-300 rounded focus:ring-up-maroon-500 dark:focus:ring-up-maroon-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mt-1"
      />
      <label htmlFor={id} className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
        {label}
      </label>
    </div>
  )
);

Checkbox.displayName = 'Checkbox';