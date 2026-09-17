'use client';

import React, { useState } from 'react';
import { useActionState } from 'react';
import { loginAction, LoginFormState } from '@/lib/auth/actions';

const initialState: LoginFormState = {};

interface LoginFormProps {
  showDemoHelpers?: boolean;
}

export function LoginForm({ showDemoHelpers = true }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');

  const demoAccounts = [
    { label: 'Platform Admin', email: 'platform@skills.test', role: 'PLATFORM_ADMIN' },
    { label: 'Support', email: 'support@skills.test', role: 'SUPPORT' },
    { label: 'Org Admin', email: 'admin@acme.test', role: 'ORGANIZATION_ADMIN' },
    { label: 'Manager', email: 'manager@acme.test', role: 'MANAGER' },
    { label: 'Staff', email: 'staff@acme.test', role: 'STAFF' },
  ];

  const handleQuickFill = (email: string) => {
    setEmailValue(email);
    setPasswordValue('Password123!');
  };

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.error && (
        <div
          role="alert"
          className="p-3.5 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 animate-in fade-in duration-200"
        >
          <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-xs font-semibold text-neutral-800 mb-1.5 uppercase tracking-wider">
          Work Email
        </label>
        <div className="relative">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            aria-invalid={Boolean(state?.fieldErrors?.email)}
            aria-describedby={state?.fieldErrors?.email ? 'email-error' : undefined}
            disabled={isPending}
            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white text-neutral-900 transition-colors placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              state?.fieldErrors?.email
                ? 'border-red-300 focus:border-red-500'
                : 'border-stone-200 hover:border-stone-300 focus:border-neutral-900'
            } disabled:bg-stone-50 disabled:text-stone-400`}
            placeholder="name@organization.com"
          />
        </div>
        {state?.fieldErrors?.email && (
          <p id="email-error" className="mt-1 text-xs text-red-600">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider">
            Password
          </label>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={passwordValue}
            onChange={(e) => setPasswordValue(e.target.value)}
            aria-invalid={Boolean(state?.fieldErrors?.password)}
            aria-describedby={state?.fieldErrors?.password ? 'password-error' : undefined}
            disabled={isPending}
            className={`w-full px-3.5 py-2.5 pr-11 text-sm rounded-xl border bg-white text-neutral-900 transition-colors placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              state?.fieldErrors?.password
                ? 'border-red-300 focus:border-red-500'
                : 'border-stone-200 hover:border-stone-300 focus:border-neutral-900'
            } disabled:bg-stone-50 disabled:text-stone-400`}
            placeholder="••••••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isPending}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-neutral-700 focus:outline-none transition-colors"
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {state?.fieldErrors?.password && (
          <p id="password-error" className="mt-1 text-xs text-red-600">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.99]"
        >
          {isPending ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign in</span>
          )}
        </button>
      </div>

      {showDemoHelpers && (
        <div className="pt-4 mt-4 border-t border-stone-100">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Evaluation Sandbox Accounts</span>
            <span className="font-normal text-stone-400">Password: Password123!</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickFill(acc.email)}
                className="text-left px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50/50 hover:bg-stone-100 hover:border-stone-300 transition-colors text-[11px] flex flex-col last:col-span-2"
              >
                <span className="font-semibold text-neutral-800">{acc.label}</span>
                <span className="text-neutral-500 font-mono text-[10px] truncate">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
