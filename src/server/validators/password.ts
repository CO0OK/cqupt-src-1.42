import { randomInt } from "node:crypto";

const COMMON_PASSWORDS = new Set<string>([
  "123456",
  "12345678",
  "123456789",
  "123123",
  "111111",
  "000000",
  "qwerty",
  "qwerty123",
  "abc123",
  "password",
  "password123",
  "admin",
  "admin123",
  "iloveyou",
]);

function normalizePassword(password: string): string {
  return password.trim().toLowerCase();
}

export function validatePasswordPolicy(password: string): string | null {
  const value = password.trim();
  if (!value) return "密码不能为空";
  if (value.length < 8 || value.length > 64) return "密码长度需在 8-64 位之间";

  const hasLetter = /[A-Za-z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  const categoryCount = Number(hasLetter) + Number(hasDigit) + Number(hasSymbol);
  if (categoryCount < 2) {
    return "密码需至少包含字母、数字、符号中的两种";
  }

  if (COMMON_PASSWORDS.has(normalizePassword(value))) {
    return "密码过于常见，请更换更安全的密码";
  }

  return null;
}

export function generateStrongTemporaryPassword(length = 12): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*_-+=";
  const all = `${letters}${digits}${symbols}`;
  const finalLength = Math.max(10, Math.min(24, length));

  const chars = [
    letters[randomInt(0, letters.length)],
    digits[randomInt(0, digits.length)],
    symbols[randomInt(0, symbols.length)],
  ];

  while (chars.length < finalLength) {
    chars.push(all[randomInt(0, all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join("");
}
