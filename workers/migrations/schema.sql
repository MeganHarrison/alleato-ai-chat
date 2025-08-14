-- Migration: 0000_keen_devos.sql
CREATE TABLE IF NOT EXISTS "Chat" (
	"id" TEXT PRIMARY KEY DEFAULT lower(hex(randomblob(16))) NOT NULL,
	"createdAt" TEXT NOT NULL,
	"messages" TEXT NOT NULL,
	"userId" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "User" (
	"id" TEXT PRIMARY KEY DEFAULT lower(hex(randomblob(16))) NOT NULL,
	"email" TEXT NOT NULL,
	"password" TEXT
);




-- Migration: 0001_sparkling_blue_marvel.sql
CREATE TABLE IF NOT EXISTS "Suggestion" (
	"id" TEXT DEFAULT lower(hex(randomblob(16))) NOT NULL,
	"documentId" TEXT NOT NULL,
	"documentCreatedAt" TEXT NOT NULL,
	"originalText" TEXT NOT NULL,
	"suggestedText" TEXT NOT NULL,
	"description" TEXT,
	"isResolved" INTEGER DEFAULT false NOT NULL,
	"userId" TEXT NOT NULL,
	"createdAt" TEXT NOT NULL,
	CONSTRAINT "Suggestion_id_pk" PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "Document" (
	"id" TEXT DEFAULT lower(hex(randomblob(16))) NOT NULL,
	"createdAt" TEXT NOT NULL,
	"title" TEXT NOT NULL,
	"content" TEXT,
	"userId" TEXT NOT NULL,
	CONSTRAINT "Document_id_createdAt_pk" PRIMARY KEY("id","createdAt")
);








-- Migration: 0002_wandering_riptide.sql
CREATE TABLE IF NOT EXISTS "Message" (
	"id" TEXT PRIMARY KEY DEFAULT lower(hex(randomblob(16))) NOT NULL,
	"chatId" TEXT NOT NULL,
	"role" TEXT NOT NULL,
	"content" TEXT NOT NULL,
	"createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Vote" (
	"chatId" TEXT NOT NULL,
	"messageId" TEXT NOT NULL,
	"isUpvoted" INTEGER NOT NULL,
	CONSTRAINT "Vote_chatId_messageId_pk" PRIMARY KEY("chatId","messageId")
);

ALTER TABLE "Chat" ADD COLUMN "title" TEXT NOT NULL;






ALTER TABLE "Chat" DROP COLUMN IF EXISTS "messages";

-- Migration: 0003_cloudy_glorian.sql
ALTER TABLE "Chat" ADD COLUMN "visibility" TEXT DEFAULT 'private' NOT NULL;

-- Migration: 0004_odd_slayback.sql
ALTER TABLE "Document" ADD COLUMN "TEXT" TEXT DEFAULT 'TEXT' NOT NULL;

-- Migration: 0005_wooden_whistler.sql
CREATE TABLE IF NOT EXISTS "Message_v2" (
	"id" TEXT PRIMARY KEY DEFAULT lower(hex(randomblob(16))) NOT NULL,
	"chatId" TEXT NOT NULL,
	"role" TEXT NOT NULL,
	"parts" TEXT NOT NULL,
	"attachments" TEXT NOT NULL,
	"createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Vote_v2" (
	"chatId" TEXT NOT NULL,
	"messageId" TEXT NOT NULL,
	"isUpvoted" INTEGER NOT NULL,
	CONSTRAINT "Vote_v2_chatId_messageId_pk" PRIMARY KEY("chatId","messageId")
);








-- Migration: 0006_marvelous_frog_thor.sql
CREATE TABLE IF NOT EXISTS "Stream" (
	"id" TEXT DEFAULT lower(hex(randomblob(16))) NOT NULL,
	"chatId" TEXT NOT NULL,
	"createdAt" TEXT NOT NULL,
	CONSTRAINT "Stream_id_pk" PRIMARY KEY("id")
);


