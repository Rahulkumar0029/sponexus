/**
 * Validation utilities for Sponexus authentication and forms
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Regex patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 128;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const COMPANY_NAME_MIN_LENGTH = 2;
const COMPANY_NAME_MAX_LENGTH = 100;

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      isValid: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      isValid: false,
      message: `Password must be less than ${PASSWORD_MAX_LENGTH} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validate name (first name, last name)
 */
export function validateName(name: string, fieldName: string = 'Name'): {
  isValid: boolean;
  message?: string;
} {
  if (!name || typeof name !== 'string') {
    return { isValid: false, message: `${fieldName} is required` };
  }

  const trimmed = name.trim();

  if (trimmed.length < NAME_MIN_LENGTH) {
    return {
      isValid: false,
      message: `${fieldName} must be at least ${NAME_MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > NAME_MAX_LENGTH) {
    return {
      isValid: false,
      message: `${fieldName} must be less than ${NAME_MAX_LENGTH} characters`,
    };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
    return {
      isValid: false,
      message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`,
    };
  }

  return { isValid: true };
}

/**
 * Validate company name
 */
export function validateCompanyName(companyName: string): {
  isValid: boolean;
  message?: string;
} {
  if (!companyName || typeof companyName !== 'string') {
    return { isValid: false, message: 'Company/Organization name is required' };
  }

  const trimmed = companyName.trim();

  if (trimmed.length < COMPANY_NAME_MIN_LENGTH) {
    return {
      isValid: false,
      message: `Company name must be at least ${COMPANY_NAME_MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > COMPANY_NAME_MAX_LENGTH) {
    return {
      isValid: false,
      message: `Company name must be less than ${COMPANY_NAME_MAX_LENGTH} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validate role
 */
export function validateRole(role: string): {
  isValid: boolean;
  message?: string;
} {
  if (!role || typeof role !== 'string') {
    return { isValid: false, message: 'Role is required' };
  }

  const validRoles = ['ORGANIZER', 'SPONSOR'];
  if (!validRoles.includes(role.toUpperCase())) {
    return {
      isValid: false,
      message: `Role must be one of: ${validRoles.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate registration data
 */
export function validateRegistration(data: {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  role?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // Email validation
  if (!data.email || !validateEmail(data.email)) {
    errors.push({
      field: 'email',
      message: 'Please enter a valid email address',
    });
  }

  // Password validation
  const passwordValidation = validatePassword(data.password || '');
  if (!passwordValidation.isValid) {
    errors.push({
      field: 'password',
      message: passwordValidation.message || 'Invalid password',
    });
  }

  // Confirm password
  if (data.password !== data.confirmPassword) {
    errors.push({
      field: 'confirmPassword',
      message: 'Passwords do not match',
    });
  }

  // First name
  const firstNameValidation = validateName(data.firstName || '', 'First name');
  if (!firstNameValidation.isValid) {
    errors.push({
      field: 'firstName',
      message: firstNameValidation.message || 'Invalid first name',
    });
  }

  // Last name
  const lastNameValidation = validateName(data.lastName || '', 'Last name');
  if (!lastNameValidation.isValid) {
    errors.push({
      field: 'lastName',
      message: lastNameValidation.message || 'Invalid last name',
    });
  }

  // Company name
  const companyNameValidation = validateCompanyName(data.companyName || '');
  if (!companyNameValidation.isValid) {
    errors.push({
      field: 'companyName',
      message: companyNameValidation.message || 'Invalid company name',
    });
  }

  // Role
  const roleValidation = validateRole(data.role || '');
  if (!roleValidation.isValid) {
    errors.push({
      field: 'role',
      message: roleValidation.message || 'Invalid role',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate login data
 */
export function validateLogin(data: {
  email?: string;
  password?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // Email validation
  if (!data.email || !validateEmail(data.email)) {
    errors.push({
      field: 'email',
      message: 'Please enter a valid email address',
    });
  }

  // Password validation
  if (!data.password) {
    errors.push({
      field: 'password',
      message: 'Password is required',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a string array for forms
 */
export function validateStringArray(
  value: unknown,
  fieldName: string,
  minItems = 1,
): {
  isValid: boolean;
  message?: string;
} {
  if (!Array.isArray(value) || value.length < minItems) {
    return {
      isValid: false,
      message: `${fieldName} must be an array with at least ${minItems} item${minItems > 1 ? 's' : ''}`,
    };
  }

  const invalid = value.some((item) => typeof item !== 'string' || !item.trim());
  if (invalid) {
    return {
      isValid: false,
      message: `${fieldName} must contain valid strings only`,
    };
  }

  return { isValid: true };
}

/**
 * Validate numeric fields in forms
 */
export function validateNumberField(
  value: unknown,
  fieldName: string,
  min = 0,
): {
  isValid: boolean;
  message?: string;
} {
  const numberValue = typeof value === 'string' ? Number(value) : value;
  if (typeof numberValue !== 'number' || Number.isNaN(numberValue)) {
    return {
      isValid: false,
      message: `${fieldName} must be a number`,
    };
  }

  if (numberValue < min) {
    return {
      isValid: false,
      message: `${fieldName} must be at least ${min}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate event creation data
 */
export function validateEventInput(data: {
  title?: string;
  description?: string;
  category?: string;
  eventType?: string;
  location?: string;
  eventDate?: string;
  startDate?: string;
  endDate?: string;
  expectedAudience?: unknown;
  targetAudience?: unknown;
  budgetRequired?: unknown;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.title || !data.title.trim()) {
    errors.push({ field: 'title', message: 'Title is required' });
  }

  if (!data.description || !data.description.trim()) {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  const categoryValue = data.category || data.eventType;
  if (!categoryValue || typeof categoryValue !== 'string') {
    errors.push({ field: 'category', message: 'Category is required' });
  }

  if (!data.location || !data.location.trim()) {
    errors.push({ field: 'location', message: 'Location is required' });
  }

  const budgetValidation = validateNumberField(data.budgetRequired, 'Budget required');
  if (!budgetValidation.isValid) {
    errors.push({ field: 'budgetRequired', message: budgetValidation.message || 'Budget is required' });
  }

  const expectedAudienceValidation = validateNumberField(data.expectedAudience, 'Expected audience');
  if (!expectedAudienceValidation.isValid) {
    errors.push({ field: 'expectedAudience', message: expectedAudienceValidation.message || 'Expected audience is required' });
  }

  const targetAudienceValidation = validateStringArray(data.targetAudience, 'Target audience');
  if (!targetAudienceValidation.isValid) {
    errors.push({ field: 'targetAudience', message: targetAudienceValidation.message || 'Target audience is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate sponsor creation data
 */
export function validateSponsor(data: {
  brandName?: string;
  description?: string;
  budget?: string;
  preferredCategories?: string[];
  targetAudience?: string;
  locationPreference?: string;
}): { success: boolean; message?: string } {
  if (!data.brandName || !data.brandName.trim()) {
    return { success: false, message: 'Brand name is required' };
  }

  if (!data.description || !data.description.trim()) {
    return { success: false, message: 'Description is required' };
  }

  if (!data.budget || !data.budget.trim()) {
    return { success: false, message: 'Budget is required' };
  }

  if (!data.preferredCategories || !Array.isArray(data.preferredCategories) || data.preferredCategories.length === 0) {
    return { success: false, message: 'Preferred categories are required' };
  }

  if (!data.targetAudience || !data.targetAudience.trim()) {
    return { success: false, message: 'Target audience is required' };
  }

  if (!data.locationPreference || !data.locationPreference.trim()) {
    return { success: false, message: 'Location preference is required' };
  }

  return { success: true };
}

/**
 * Get error message for field
 */
export function getFieldError(errors: ValidationError[], field: string): string | null {
  const error = errors.find((e) => e.field === field);
  return error?.message || null;
}
