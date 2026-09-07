CREATE TYPE "HistoryActorType" AS ENUM ('USER', 'ANONYMOUS', 'SYSTEM');

CREATE TABLE "HistoryEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorType" "HistoryActorType" NOT NULL,
  "actorUserId" UUID,
  "eventType" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" UUID NOT NULL,
  "payload" JSONB NOT NULL,
  CONSTRAINT "HistoryEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HistoryEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HistoryEvent_actor_check" CHECK (
    ("actorType" = 'USER' AND "actorUserId" IS NOT NULL) OR
    ("actorType" IN ('ANONYMOUS', 'SYSTEM') AND "actorUserId" IS NULL)
  ),
  CONSTRAINT "HistoryEvent_envelope_check" CHECK (
    length(btrim("eventType")) > 0 AND length(btrim("subjectType")) > 0 AND jsonb_typeof("payload") = 'object'
  )
);
CREATE INDEX "HistoryEvent_subjectType_subjectId_occurredAt_id_idx" ON "HistoryEvent"("subjectType", "subjectId", "occurredAt", "id");
CREATE INDEX "HistoryEvent_actorUserId_occurredAt_idx" ON "HistoryEvent"("actorUserId", "occurredAt");

CREATE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'History events are append-only';
END;
$$;
CREATE TRIGGER "HistoryEvent_append_only" BEFORE UPDATE OR DELETE ON "HistoryEvent"
FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
