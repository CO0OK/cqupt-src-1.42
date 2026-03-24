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
