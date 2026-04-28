import React from 'react';
import { getPasswordStrength } from '../utils/passwordPolicy';

interface PasswordStrengthBarProps {
  password: string;
}

const SEGMENT_COLORS: Record<string, string[]> = {
  weak:        ['bg-red-500',    'bg-gray-200 dark:bg-slate-700', 'bg-gray-200 dark:bg-slate-700', 'bg-gray-200 dark:bg-slate-700'],
  medium:      ['bg-amber-400',  'bg-amber-400',                  'bg-gray-200 dark:bg-slate-700', 'bg-gray-200 dark:bg-slate-700'],
  strong:      ['bg-blue-500',   'bg-blue-500',                   'bg-blue-500',                   'bg-gray-200 dark:bg-slate-700'],
  'very-strong':['bg-emerald-500','bg-emerald-500',               'bg-emerald-500',                'bg-emerald-500'],
};

const LABEL_COLORS: Record<string, string> = {
  weak:         'text-red-500',
  medium:       'text-amber-500',
  strong:       'text-blue-500',
  'very-strong':'text-emerald-500',
};

export default function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const { level, label } = getPasswordStrength(password);
  if (level === 'empty') return null;

  const segments = SEGMENT_COLORS[level] ?? SEGMENT_COLORS.weak;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {segments.map((cls, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${cls}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ml-0.5 ${LABEL_COLORS[level]}`}>密码强度：{label}</p>
    </div>
  );
}
