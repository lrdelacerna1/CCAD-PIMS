import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'danger' | 'success' | 'secondary' | 'dark';
}

export const Button: React.FC<ButtonProps> = ({ children, isLoading = false, variant = 'primary', className, ...props }) => {
  const baseClasses = "font-sans text-[12px] font-semibold uppercase tracking-wider leading-none rounded-[12px] h-[30px] px-4 flex items-center justify-center transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm box-border";

  const variantClasses = {
    primary: "bg-up-maroon-700 text-white hover:bg-up-maroon-800 focus:ring-4 focus:outline-none focus:ring-up-maroon-700/50",
    dark: "bg-black text-white hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-black/50",
    secondary: "bg-white text-black hover:bg-gray-100 border border-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 dark:border-slate-500 focus:ring-4 focus:outline-none focus:ring-slate-300/50",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-4 focus:outline-none focus:ring-rose-600/50",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-4 focus:outline-none focus:ring-emerald-600/50",
  };

  const finalClassName = `${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${className || ''}`.trim();

  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      className={finalClassName}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};