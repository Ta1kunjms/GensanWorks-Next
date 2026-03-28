CREATE TABLE IF NOT EXISTS "account_deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" varchar(50) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"email" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"reason" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"delete_after" timestamp NOT NULL,
	"cancelled_at" timestamp,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_account_deletion_requests_role_user_status" ON "account_deletion_requests" ("role", "user_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_account_deletion_requests_delete_after" ON "account_deletion_requests" ("delete_after");
