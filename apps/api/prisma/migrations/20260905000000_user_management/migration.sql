-- Existing accounts and the bootstrap keep their password and unrestricted state.
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
CREATE TYPE "RecoveryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');
CREATE TABLE "PasswordRecoveryRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "status" "RecoveryStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "resolvedAt" TIMESTAMPTZ(3),
  "resolvedById" UUID,
  "identityVerified" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "PasswordRecoveryRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordRecoveryRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PasswordRecoveryRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "recovery_other_resolver" CHECK ("resolvedById" IS NULL OR "resolvedById" <> "userId"),
  CONSTRAINT "recovery_approval_verified" CHECK ("status" <> 'APPROVED' OR ("identityVerified" AND "resolvedById" IS NOT NULL))
);
CREATE INDEX "PasswordRecoveryRequest_status_expiresAt_idx" ON "PasswordRecoveryRequest"("status", "expiresAt");
CREATE INDEX "PasswordRecoveryRequest_userId_idx" ON "PasswordRecoveryRequest"("userId");
-- Expired pending rows are transitioned before a replacement is inserted.
CREATE UNIQUE INDEX "recovery_one_pending_per_user" ON "PasswordRecoveryRequest"("userId") WHERE "status" = 'PENDING';
