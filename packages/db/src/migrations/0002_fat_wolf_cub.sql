CREATE TABLE "recurring_todo_completion" (
	"id" serial PRIMARY KEY NOT NULL,
	"todo_id" integer NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"completed_at" timestamp,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recurring_todo_completion" ADD CONSTRAINT "recurring_todo_completion_todo_id_todo_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_todo_completion" ADD CONSTRAINT "recurring_todo_completion_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_todo_completion_todoId_idx" ON "recurring_todo_completion" USING btree ("todo_id");--> statement-breakpoint
CREATE INDEX "recurring_todo_completion_userId_idx" ON "recurring_todo_completion" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_todo_completion_scheduledDate_idx" ON "recurring_todo_completion" USING btree ("scheduled_date");