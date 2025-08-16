'use client';

import { UIMessage } from '@/lib/types';
import { PreviewMessage as Message } from './message';
import { MessageSkeleton } from './message-skeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
  stop: () => void;
  reload: () => void;
  artifacts: Array<{ id: string; title: string; kind: string }>;
  setSelectedArtifactId: (id: string) => void;
}

export function MessageList({
  messages,
  isLoading,
  stop,
  reload,
  artifacts,
  setSelectedArtifactId,
}: MessageListProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AnimatePresence initial={false}>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Message
              message={message}
              isLast={index === messages.length - 1}
              artifacts={artifacts}
              setSelectedArtifactId={setSelectedArtifactId}
            />
          </motion.div>
        ))}
        
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <MessageSkeleton />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}