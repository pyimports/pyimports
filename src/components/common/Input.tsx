"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, leftIcon, rightIcon, className = "", id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-dark-text mb-1.5"
          >
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              "w-full bg-dark-surface border rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-muted",
              "transition-all duration-150 outline-none",
              "focus:border-accent focus:ring-2 focus:ring-accent/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error
                ? "border-danger focus:border-danger focus:ring-danger/20"
                : "border-dark-border-light",
              leftIcon ? "pl-10" : "",
              rightIcon ? "pr-10" : "",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {helper && !error && (
          <p className="mt-1 text-xs text-muted">{helper}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
  counter?: boolean;
  maxLength?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helper, counter, maxLength, className = "", id, value, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2)}`;
    const currentLength = typeof value === "string" ? value.length : 0;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-dark-text mb-1.5"
          >
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          maxLength={maxLength}
          value={value}
          className={[
            "w-full bg-dark-surface border rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-muted",
            "transition-all duration-150 outline-none resize-none",
            "focus:border-accent focus:ring-2 focus:ring-accent/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-danger focus:border-danger focus:ring-danger/20"
              : "border-dark-border-light",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        <div className="flex justify-between mt-1">
          {error ? (
            <p className="text-xs text-danger">{error}</p>
          ) : helper ? (
            <p className="text-xs text-muted">{helper}</p>
          ) : (
            <span />
          )}
          {counter && maxLength && (
            <span className={`text-xs ${currentLength > maxLength * 0.9 ? "text-warning" : "text-muted"}`}>
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
