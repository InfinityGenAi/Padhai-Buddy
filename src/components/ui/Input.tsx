"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, useId, useState, type ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showPasswordToggle?: boolean;
  pill?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      pill = false,
      className = "",
      id: providedId,
      type = "text",
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const [showPassword, setShowPassword] = useState(false);

    const inputType = showPasswordToggle && showPassword ? "text" : type;

    const baseInputClasses = pill
      ? "auth-input rounded-full pl-10 pr-12"
      : "auth-input";

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="label-text">
            {label}
            {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="auth-input-icon" aria-hidden="true">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            type={inputType}
            disabled={disabled}
            required={required}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={`${error ? errorId : ""} ${hint ? hintId : ""}`.trim() || undefined}
            className={`
              ${baseInputClasses}
              ${leftIcon ? "pl-10" : ""}
              ${rightIcon || showPasswordToggle ? "pr-12" : ""}
              ${error ? "border-error focus:border-error focus:ring-red-500/30" : ""}
              ${disabled ? "bg-background-tertiary cursor-not-allowed" : ""}
              ${className}
            `}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
          {rightIcon && !showPasswordToggle && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-error flex items-center gap-1" role="alert">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 100 2h2a1 1 0 100-2H10z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-foreground-subtle">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      className = "",
      id: providedId,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="label-text">
            {label}
            {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          disabled={disabled}
          required={required}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={`${error ? errorId : ""} ${hint ? hintId : ""}`.trim() || undefined}
          className={`
            input-field
            resize-none
            ${error ? "border-error focus:border-error focus:ring-red-500/30" : ""}
            ${disabled ? "bg-background-tertiary cursor-not-allowed" : ""}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-error flex items-center gap-1" role="alert">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 100 2h2a1 1 0 100-2H10z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-foreground-subtle">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  pill?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      placeholder,
      pill = false,
      className = "",
      id: providedId,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const baseSelectClasses = pill
      ? "auth-select rounded-full pl-10 pr-12"
      : "auth-select";

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="label-text">
            {label}
            {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          required={required}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={`${error ? errorId : ""} ${hint ? hintId : ""}`.trim() || undefined}
          className={`
            ${baseSelectClasses}
            ${error ? "border-error focus:border-error focus:ring-red-500/30" : ""}
            ${disabled ? "bg-background-tertiary cursor-not-allowed" : ""}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-error flex items-center gap-1" role="alert">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 100 2h2a1 1 0 100-2H10z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-foreground-subtle">{hint}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export interface LabelProps {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}

export function Label({ children, htmlFor, className = "", required = false }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={`label-text ${className}`}>
      {children}
      {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
    </label>
  );
}