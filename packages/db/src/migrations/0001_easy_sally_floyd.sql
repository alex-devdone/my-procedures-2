CREATE TABLE "folder" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'slate' NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtask" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"todo_id" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "reminder_at" timestamp;--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "recurring_pattern" jsonb;--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "folder_id" integer;--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtask" ADD CONSTRAINT "subtask_todo_id_todo_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "folder_userId_idx" ON "folder" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subtask_todoId_idx" ON "subtask" USING btree ("todo_id");--> statement-breakpoint
ALTER TABLE "todo" ADD CONSTRAINT "todo_folder_id_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "todo_dueDate_idx" ON "todo" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "todo_folderId_idx" ON "todo" USING btree ("folder_id");