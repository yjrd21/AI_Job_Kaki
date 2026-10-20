// Represent the application account and its saved onboarding status.
export interface User {
  id: string;
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  onboardingCompleted: boolean;
}

// Limit account updates to the editable name and email fields.
export type UserUpdate = Partial<
  Pick<User, "email" | "firstName" | "lastName">
>;
