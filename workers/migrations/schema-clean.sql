-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT
);

-- Create Chat table
CREATE TABLE IF NOT EXISTS "Chat" (
    "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visibility" TEXT DEFAULT 'private' NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- Create Message_v2 table (current version)
CREATE TABLE IF NOT EXISTS "Message_v2" (
    "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "parts" TEXT NOT NULL, -- JSON stored as text
    "attachments" TEXT NOT NULL, -- JSON stored as text
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id")
);

-- Create Document table
CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT DEFAULT (lower(hex(randomblob(16)))),
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "type" TEXT DEFAULT 'text' NOT NULL,
    "userId" TEXT NOT NULL,
    PRIMARY KEY("id", "createdAt"),
    FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- Create Suggestion table
CREATE TABLE IF NOT EXISTS "Suggestion" (
    "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "documentId" TEXT NOT NULL,
    "documentCreatedAt" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    "description" TEXT,
    "isResolved" INTEGER DEFAULT 0 NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- Create Vote_v2 table
CREATE TABLE IF NOT EXISTS "Vote_v2" (
    "chatId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "isUpvoted" INTEGER NOT NULL,
    PRIMARY KEY("chatId", "messageId"),
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id")
);

-- Create Stream table
CREATE TABLE IF NOT EXISTS "Stream" (
    "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "chatId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON "Message_v2"("chatId");
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON "Message_v2"("createdAt");
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON "Chat"("userId");
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON "Document"("userId");
CREATE INDEX IF NOT EXISTS idx_stream_chat_id ON "Stream"("chatId");