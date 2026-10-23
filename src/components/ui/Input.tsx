import React, { forwardRef } from 'react';
import { cn } from '../../lib/ui';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  mono?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      mono = false,
      leftIcon,
      rightIcon,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-porcelain flex items-center justify-between">
            <span>{label}</span>
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span className="absolute left-3 text-silver/60 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'field',
              Boolean(leftIcon) && 'pl-9',
              Boolean(rightIcon) && 'pr-9',
              mono ? 'font-mono text-xs' : undefined,
              error ? 'border-[var(--color-coral-error)]/60 focus:border-[var(--color-coral-error)] focus:ring-[var(--color-coral-error)]/15' : undefined,
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-silver/60 pointer-events-none flex items-center justify-center">
              {rightIcon}
            </span>
          )}
        </div>
        {error ? (
          <span className="text-[11px] text-[#FF777F]">{error}</span>
        ) : helperText ? (
          <span className="text-[11px] text-silver/70">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, className, id, ...props }, ref) => {
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-medium text-porcelain">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'field',
            error ? 'border-[#FF777F]/60 focus:border-[#FF777F] focus:ring-[#FF777F]/15' : undefined,
            className
          )}
          {...props}
        />
        {error ? (
          <span className="text-[11px] text-[#FF777F]">{error}</span>
        ) : helperText ? (
          <span className="text-[11px] text-silver/70">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
