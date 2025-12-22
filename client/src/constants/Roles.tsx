export const ROLES = {
  ADMIN: 'admin',
  CLINICIAN: 'clinician',
  THERAPIST: 'therapist',
  LAB: 'lab',
  PARENT: 'parent',
} as const;

export type UserRole = keyof typeof ROLES;
