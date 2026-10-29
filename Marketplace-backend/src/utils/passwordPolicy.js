export const PASSWORD_MIN_LENGTH = 9;
export const PASSWORD_MAX_LENGTH = 128;

const HAS_NUMBER = /\d/;
const HAS_SPECIAL_CHARACTER = /[^A-Za-z0-9\s]/;

const COMMON_PASSWORDS = new Set([
  '123456789012345',
  'adminadminadmin',
  'changemechangeme',
  'iloveyouiloveyou',
  'letmeinletmein',
  'passwordpassword',
  'password123456',
  'password123456!',
  'qwertyuiop12345',
  'universityofnewcastle',
  'uonmarketplace',
  'welcome123456!',
]);

export function validatePassword(password) {
  if (typeof password !== 'string') {
    return { error: 'Password must be a string' };
  }

  const length = Array.from(password).length;
  if (length < PASSWORD_MIN_LENGTH) {
    return { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  if (length > PASSWORD_MAX_LENGTH) {
    return { error: `Password must be no more than ${PASSWORD_MAX_LENGTH} characters` };
  }
  if (!HAS_NUMBER.test(password) || !HAS_SPECIAL_CHARACTER.test(password)) {
    return { error: 'Password must contain at least 1 number and 1 special character' };
  }

  const blocklistValue = password.normalize('NFKC').toLocaleLowerCase('en-US');
  if (!blocklistValue.trim() || COMMON_PASSWORDS.has(blocklistValue)) {
    return { error: 'Password is too common. Choose a longer, less predictable passphrase.' };
  }

  return { error: null };
}
