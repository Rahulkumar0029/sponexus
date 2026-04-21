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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 200;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 60;
const COMPANY_NAME_MIN_LENGTH = 2;
const COMPANY_NAME_MAX_LENGTH = 120;
const MAX_STRING_ARRAY_ITEMS = 20;
const MAX_STRING_ITEM_LENGTH = 100;
const MAX_TEXT_LENGTH = 5000;
const MAX_BUDGET = 100000000;
const MAX_AUDIENCE = 1000000;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function dedupeTrimmedArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => cleanString(item))
        .filter(
          (item) => Boolean(item) && item.length <= MAX_STRING_ITEM_LENGTH
        )
    ),
  ].slice(0, MAX_STRING_ARRAY_ITEMS);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (!password || typeof password !== "string") {
    return { isValid: false, message: "Password is required" };
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
export function validateName(
  name: string,
  fieldName: string = "Name"
): {
  isValid: boolean;
  message?: string;
} {
  if (!name || typeof name !== "string") {
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
  if (!companyName || typeof companyName !== "string") {
    return { isValid: false, message: "Company/Organization name is required" };
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
  if (!role || typeof role !== "string") {
    return { isValid: false, message: "Role is required" };
  }

  const normalizedRole = role.trim().toUpperCase();
  const validRoles = ["ORGANIZER", "SPONSOR"];

  if (!validRoles.includes(normalizedRole)) {
    return {
      isValid: false,
      message: `Role must be one of: ${validRoles.join(", ")}`,
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

  if (!data.email || !validateEmail(data.email)) {
    errors.push({
      field: "email",
      message: "Please enter a valid email address",
    });
  }

  const passwordValidation = validatePassword(data.password || "");
  if (!passwordValidation.isValid) {
    errors.push({
      field: "password",
      message: passwordValidation.message || "Invalid password",
    });
  }

  if (data.password !== data.confirmPassword) {
    errors.push({
      field: "confirmPassword",
      message: "Passwords do not match",
    });
  }

  const firstNameValidation = validateName(data.firstName || "", "First name");
  if (!firstNameValidation.isValid) {
    errors.push({
      field: "firstName",
      message: firstNameValidation.message || "Invalid first name",
    });
  }

  const lastNameValidation = validateName(data.lastName || "", "Last name");
  if (!lastNameValidation.isValid) {
    errors.push({
      field: "lastName",
      message: lastNameValidation.message || "Invalid last name",
    });
  }

  const companyNameValidation = validateCompanyName(data.companyName || "");
  if (!companyNameValidation.isValid) {
    errors.push({
      field: "companyName",
      message: companyNameValidation.message || "Invalid company name",
    });
  }

  const roleValidation = validateRole(data.role || "");
  if (!roleValidation.isValid) {
    errors.push({
      field: "role",
      message: roleValidation.message || "Invalid role",
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

  if (!data.email || !validateEmail(data.email)) {
    errors.push({
      field: "email",
      message: "Please enter a valid email address",
    });
  }

  if (!data.password) {
    errors.push({
      field: "password",
      message: "Password is required",
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
  minItems = 1
): {
  isValid: boolean;
  message?: string;
} {
  if (!Array.isArray(value) || value.length < minItems) {
    return {
      isValid: false,
      message: `${fieldName} must be an array with at least ${minItems} item${
        minItems > 1 ? "s" : ""
      }`,
    };
  }

  const normalized = dedupeTrimmedArray(value);

  if (normalized.length < minItems) {
    return {
      isValid: false,
      message: `${fieldName} must contain valid strings only`,
    };
  }

  if (normalized.length > MAX_STRING_ARRAY_ITEMS) {
    return {
      isValid: false,
      message: `${fieldName} cannot exceed ${MAX_STRING_ARRAY_ITEMS} items`,
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
  max = Number.MAX_SAFE_INTEGER
): {
  isValid: boolean;
  message?: string;
} {
  const numberValue = typeof value === "string" ? Number(value) : value;

  if (typeof numberValue !== "number" || Number.isNaN(numberValue)) {
    return {
      isValid: false,
      message: `${fieldName} must be a number`,
    };
  }

  if (!Number.isFinite(numberValue)) {
    return {
      isValid: false,
      message: `${fieldName} must be a valid number`,
    };
  }

  if (numberValue < min) {
    return {
      isValid: false,
      message: `${fieldName} must be at least ${min}`,
    };
  }

  if (numberValue > max) {
    return {
      isValid: false,
      message: `${fieldName} must be less than or equal to ${max}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate plain text field
 */
export function validateTextField(
  value: unknown,
  fieldName: string,
  minLength = 1,
  maxLength = MAX_TEXT_LENGTH
): {
  isValid: boolean;
  message?: string;
} {
  const text = cleanString(value);

  if (!text) {
    return {
      isValid: false,
      message: `${fieldName} is required`,
    };
  }

  if (text.length < minLength) {
    return {
      isValid: false,
      message: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  if (text.length > maxLength) {
    return {
      isValid: false,
      message: `${fieldName} must be less than ${maxLength} characters`,
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

  const titleValidation = validateTextField(data.title, "Title", 1, 150);
  if (!titleValidation.isValid) {
    errors.push({
      field: "title",
      message: titleValidation.message || "Title is required",
    });
  }

  const descriptionValidation = validateTextField(
    data.description,
    "Description",
    1,
    5000
  );
  if (!descriptionValidation.isValid) {
    errors.push({
      field: "description",
      message: descriptionValidation.message || "Description is required",
    });
  }

  const categoryValue = data.category || data.eventType;
  if (!categoryValue || typeof categoryValue !== "string" || !categoryValue.trim()) {
    errors.push({ field: "category", message: "Category is required" });
  }

  const locationValidation = validateTextField(data.location, "Location", 1, 200);
  if (!locationValidation.isValid) {
    errors.push({
      field: "location",
      message: locationValidation.message || "Location is required",
    });
  }

  const budgetValidation = validateNumberField(
    data.budgetRequired,
    "Budget required",
    0,
    MAX_BUDGET
  );
  if (!budgetValidation.isValid) {
    errors.push({
      field: "budgetRequired",
      message: budgetValidation.message || "Budget is required",
    });
  }

  const expectedAudienceValidation = validateNumberField(
    data.expectedAudience,
    "Expected audience",
    1,
    MAX_AUDIENCE
  );
  if (!expectedAudienceValidation.isValid) {
    errors.push({
      field: "expectedAudience",
      message:
        expectedAudienceValidation.message || "Expected audience is required",
    });
  }

  const targetAudienceValidation = validateStringArray(
    data.targetAudience,
    "Target audience"
  );
  if (!targetAudienceValidation.isValid) {
    errors.push({
      field: "targetAudience",
      message:
        targetAudienceValidation.message || "Target audience is required",
    });
  }

  if (data.startDate && Number.isNaN(new Date(data.startDate).getTime())) {
    errors.push({
      field: "startDate",
      message: "Start date is invalid",
    });
  }

  if (data.endDate && Number.isNaN(new Date(data.endDate).getTime())) {
    errors.push({
      field: "endDate",
      message: "End date is invalid",
    });
  }

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      errors.push({
        field: "endDate",
        message: "End date cannot be before start date",
      });
    }
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
  const brandValidation = validateTextField(data.brandName, "Brand name", 1, 120);
  if (!brandValidation.isValid) {
    return { success: false, message: brandValidation.message };
  }

  const descriptionValidation = validateTextField(
    data.description,
    "Description",
    1,
    3000
  );
  if (!descriptionValidation.isValid) {
    return { success: false, message: descriptionValidation.message };
  }

  const budgetValidation = validateNumberField(data.budget, "Budget", 0, MAX_BUDGET);
  if (!budgetValidation.isValid) {
    return { success: false, message: budgetValidation.message };
  }

  const categoriesValidation = validateStringArray(
    data.preferredCategories,
    "Preferred categories"
  );
  if (!categoriesValidation.isValid) {
    return { success: false, message: categoriesValidation.message };
  }

  const audienceValidation = validateTextField(
    data.targetAudience,
    "Target audience",
    1,
    120
  );
  if (!audienceValidation.isValid) {
    return { success: false, message: audienceValidation.message };
  }

  const locationValidation = validateTextField(
    data.locationPreference,
    "Location preference",
    1,
    120
  );
  if (!locationValidation.isValid) {
    return { success: false, message: locationValidation.message };
  }

  return { success: true };
}

/**
 * Get error message for field
 */
export function getFieldError(
  errors: ValidationError[],
  field: string
): string | null {
  const error = errors.find((e) => e.field === field);
  return error?.message || null;
}