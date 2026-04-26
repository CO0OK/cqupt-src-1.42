const COMMON_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  '123123',
  '111111',
  '000000',
  'qwerty',
  'qwerty123',
  'abc123',
  'password',
  'password123',
  'admin',
  'admin123',
  'iloveyou',
]);

export const PASSWORD_POLICY_HINT = '密码需 8-64 位，且至少包含字母/数字/符号中的两种，不可使用常见弱口令。';

export type PasswordStrengthLevel = 'empty' | 'weak' | 'medium' | 'strong' | 'very-strong';

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  label: string;
  score: number; // 0-4
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { level: 'empty', label: '', score: 0 };
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const categories = Number(hasLetter) + Number(hasDigit) + Number(hasSymbol);
  const len = password.length;

  if (len < 8 || categories < 2) return { level: 'weak', label: '弱', score: 1 };
  if (categories === 3 && len >= 16) return { level: 'very-strong', label: '非常强', score: 4 };
  if ((categories === 3 && len >= 12) || (categories === 2 && len >= 16)) return { level: 'strong', label: '强', score: 3 };
  return { level: 'medium', label: '中等', score: 2 };
}

export function validatePasswordPolicyText(password: string): string | null {
  const value = password.trim();
  if (!value) return '密码不能为空';
  if (value.length < 8 || value.length > 64) return '密码长度需在 8-64 位之间';
  const hasLetter = /[A-Za-z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  if (Number(hasLetter) + Number(hasDigit) + Number(hasSymbol) < 2) {
    return '密码需至少包含字母、数字、符号中的两种';
  }
  if (COMMON_PASSWORDS.has(value.toLowerCase())) {
    return '密码过于常见，请更换更安全的密码';
  }
  return null;
}
