/**
 * Date validation and birthday-aware age calculation utilities.
 * Ensures backend is the strict authority on Date of Birth and Senior age eligibility.
 */

export interface DobValidationResult {
  valid: boolean;
  dob?: Date;
  error?: string;
}

/**
 * Validates that an input is a legitimate, past calendar date.
 * Handles YYYY-MM-DD strings and Date objects.
 * Rejects malformed dates, invalid calendar days (e.g., Feb 30), and future dates.
 */
export function parseAndValidateDob(dobInput: any): DobValidationResult {
  if (!dobInput) {
    return { valid: false, error: 'Date of birth is required for Senior Citizen registration.' };
  }

  let dateObj: Date;

  if (typeof dobInput === 'string') {
    const trimmed = dobInput.trim();
    if (!trimmed) {
      return { valid: false, error: 'Date of birth cannot be empty.' };
    }

    // Match YYYY-MM-DD pattern
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!match) {
      // Fallback parse attempt
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) {
        return { valid: false, error: 'Invalid Date of Birth format. Please use YYYY-MM-DD.' };
      }
      dateObj = parsed;
    } else {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);

      // Validate month bounds
      if (month < 1 || month > 12) {
        return { valid: false, error: 'Invalid month in Date of Birth (must be 1-12).' };
      }

      // Validate day bounds for the specific month and year (accounts for leap years)
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      if (day < 1 || day > daysInMonth) {
        return {
          valid: false,
          error: `Invalid day in Date of Birth: Month ${month} in year ${year} only has ${daysInMonth} days.`
        };
      }

      // Construct UTC Date at midnight
      dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
  } else if (dobInput instanceof Date) {
    if (isNaN(dobInput.getTime())) {
      return { valid: false, error: 'Invalid Date of Birth.' };
    }
    dateObj = dobInput;
  } else {
    return { valid: false, error: 'Date of birth must be a valid date string or Date object.' };
  }

  const now = new Date();

  // Ensure DOB is strictly in the past
  if (dateObj.getTime() > now.getTime()) {
    return { valid: false, error: 'Date of birth cannot be in the future.' };
  }

  // Reasonable year check
  const birthYear = dateObj.getUTCFullYear();
  if (birthYear < 1900) {
    return { valid: false, error: 'Date of birth year must be 1900 or later.' };
  }

  return { valid: true, dob: dateObj };
}

/**
 * Calculates birthday-aware age in completed years.
 * Compares current UTC month and day with birth UTC month and day.
 */
export function calculateAgeFromDob(dob: Date, referenceDate: Date = new Date()): number {
  const currentYear = referenceDate.getUTCFullYear();
  const currentMonth = referenceDate.getUTCMonth(); // 0-11
  const currentDay = referenceDate.getUTCDate(); // 1-31

  const birthYear = dob.getUTCFullYear();
  const birthMonth = dob.getUTCMonth(); // 0-11
  const birthDay = dob.getUTCDate(); // 1-31

  let age = currentYear - birthYear;

  // If birth month has not occurred yet this year, or is current month but birth day has not occurred yet
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age--;
  }

  return age;
}
