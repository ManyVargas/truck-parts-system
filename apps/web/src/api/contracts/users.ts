import type { Role, User } from './entities';

/** Administrator-facing user row — password never leaves the mock/auth boundary. */
export type ManagedUser = Omit<User, 'password'>;

export type SaveUserInput = {
  id?: string;
  name: string;
  username: string;
  /** Required when creating; omitted on edit keeps the current password. */
  password?: string;
  role: Role;
  active: boolean;
  phone?: string;
  email?: string;
};
