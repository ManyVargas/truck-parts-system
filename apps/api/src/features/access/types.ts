// Internal persistence input. Token generation and hashing belong to the access service.
export type CreateSessionRecord = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
};
