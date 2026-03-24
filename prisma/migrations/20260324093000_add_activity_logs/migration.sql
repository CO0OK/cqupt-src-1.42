CREATE TABLE "activity_logs" (
  "id" UUID NOT NULL,
  "actor_id" UUID,
  "action" VARCHAR(80) NOT NULL,
  "target_type" VARCHAR(50),
  "target_id" VARCHAR(120),
  "detail" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'success',
  "ip" VARCHAR(64),
  "user_agent" VARCHAR(255),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");
CREATE INDEX "activity_logs_actor_id_created_at_idx" ON "activity_logs"("actor_id", "created_at");
CREATE INDEX "activity_logs_target_type_target_id_idx" ON "activity_logs"("target_type", "target_id");
CREATE INDEX "activity_logs_action_created_at_idx" ON "activity_logs"("action", "created_at");

ALTER TABLE "activity_logs"
  ADD CONSTRAINT "activity_logs_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
