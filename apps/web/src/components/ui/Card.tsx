import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'blueprint';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-slate-900 border border-slate-800 shadow-xl shadow-black/40',
    glass: 'bg-slate-900/80 backdrop-blur-md border border-slate-800/80 shadow-2xl shadow-black/50',
    blueprint: 'bg-slate-950/90 border border-sky-500/20 shadow-xl shadow-sky-950/20'
  };

  return (
    <div
      className={twMerge(clsx('rounded-xl p-6 transition-all', variantStyles[variant], className))}
      {...props}
    >
      {children}
    </div>
  );
};
