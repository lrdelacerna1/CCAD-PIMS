import React from 'react';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }>(
  ({ label, id, ...props }, ref) => (
    <div>
      <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
        {label}
      </label>
      <textarea
        id={id}
        ref={ref}
        {...props}
        rows={3}
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-up-maroon-500 focus:border-up-maroon-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-up-maroon-500 dark:focus:border-up-maroon-500"
      />
    </div>
  )
);

Textarea.displayName = 'Textarea';