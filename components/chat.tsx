'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useWindowSize } from 'usehooks-ts';
// import { useScrollToBottom } from 'react-scroll-to-bottom';
import type { Attachment, UIMessage } from '@/lib/types';
import { convertToUIMessages } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from '@/components/toast';

// Components
import { ChatHeader } from './chat-header';
import { MessageList } from './message-list';
import { MultimodalInput } from './multimodal-input';
import { ModelSelector } from './model-selector';
import { DataStreamHandler } from './data-stream-handler';
import { Artifacts } from './artifacts';

// Icons
import { ArrowUp, Paperclip, Plus, CircleStop } from 'lucide-react';
import { Button } from './ui/button';

// Constants
import { DEFAULT_CHAT_MODEL, modelHasVision } from '@/lib/ai/models';

interface ChatProps {
  initialMessages?: UIMessage[];
  id?: string;
  user?: { id: string; email?: string; type?: string };
  modelId?: string;
  visibility?: 'public' | 'private';
}

export function Chat({
  initialMessages = [],
  id,
  user,
  modelId: initialModelId = DEFAULT_CHAT_MODEL.model,
  visibility = 'private',
}: ChatProps) {
  const router = useRouter();
  const { width: windowWidth = 1920, height: windowHeight = 1080 } = useWindowSize();
  const [artifacts, setArtifacts] = useState<Array<{ id: string; title: string; kind: string }>>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>('');
  const [modelId, setModelId] = useState(initialModelId);
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messagesContainerRef, scrollToBottom] = useScrollToBottom();
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const {
    messages,
    setMessages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    error,
    stop,
    reload,
    append,
    data,
  } = useChat({
    id,
    api: '/api/chat',
    initialMessages: convertToUIMessages(initialMessages),
    body: {
      modelId,
      visibility,
    },
    streamProtocol: 'text',
    onResponse: (response) => {
      if (!response.ok) {
        toast.error('Failed to send message');
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('An error occurred while chatting');
    },
    onFinish: () => {
      setAttachments([]);
    },
  });

  // Handle data stream events
  useEffect(() => {
    if (data) {
      // Handle different data stream events
      const latestData = Array.isArray(data) ? data[data.length - 1] : data;
      
      if (latestData?.type === 'artifact') {
        const artifact = {
          id: latestData.id,
          title: latestData.title || 'Untitled',
          kind: latestData.kind || 'text',
        };
        setArtifacts(prev => [...prev.filter(a => a.id !== artifact.id), artifact]);
        setSelectedArtifactId(artifact.id);
      }
      
      if (latestData?.type === 'title' && latestData.title) {
        document.title = latestData.title;
      }
      
      if (latestData?.type === 'clear') {
        setArtifacts([]);
        setSelectedArtifactId('');
      }
      
      if (latestData?.type === 'redirect' && latestData.url) {
        router.push(latestData.url);
      }
    }
  }, [data, router]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(7),
      type: file.type.startsWith('image/') ? 'image' : 'file',
      name: file.name,
      size: file.size,
      file,
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const files = items
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter(Boolean) as File[];
    
    if (files.length > 0) {
      const fileList = new DataTransfer();
      files.forEach(file => fileList.items.add(file));
      handleFileSelect(fileList.files);
    }
  }, [handleFileSelect]);

  // Check if model supports vision
  const supportsVision = modelHasVision(modelId);

  // Create a new chat
  const handleNewChat = () => {
    router.push('/');
    router.refresh();
  };

  // Custom submit handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() && attachments.length === 0) return;
    
    // Upload attachments first if any
    const uploadedAttachments = await Promise.all(
      attachments.map(async (attachment) => {
        if (attachment.type === 'image' && attachment.file) {
          const formData = new FormData();
          formData.append('file', attachment.file);
          
          try {
            const response = await fetch('/api/files/upload', {
              method: 'POST',
              body: formData,
            });
            
            if (!response.ok) throw new Error('Upload failed');
            
            const data = await response.json();
            return {
              type: 'image' as const,
              url: data.url,
              name: attachment.name,
            };
          } catch (error) {
            console.error('Failed to upload file:', error);
            toast.error(`Failed to upload ${attachment.name}`);
            return null;
          }
        }
        return null;
      })
    );
    
    const validAttachments = uploadedAttachments.filter(Boolean);
    
    // Create message with attachments
    const messageToSend = {
      role: 'user' as const,
      content: input,
      experimental_attachments: validAttachments.length > 0 ? validAttachments : undefined,
    };
    
    handleSubmit(e, {
      experimental_attachments: validAttachments.length > 0 ? validAttachments : undefined,
    });
  };

  // Calculate artifacts width
  const artifactsWidth = windowWidth < 768 ? windowWidth : 600;
  const showArtifacts = artifacts.length > 0 && windowWidth >= 768;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main Chat Area */}
      <div 
        className={cn(
          "flex flex-col flex-1 transition-all duration-300",
          showArtifacts && "pr-0"
        )}
        style={{
          width: showArtifacts ? `calc(100% - ${artifactsWidth}px)` : '100%',
        }}
      >
        {/* Header */}
        <ChatHeader
          chatId={id}
          modelId={modelId}
          visibility={visibility}
          isEditingTitle={isEditingTitle}
          setIsEditingTitle={setIsEditingTitle}
          messages={messages}
        />

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <h1 className="text-3xl font-medium">How can I help you today?</h1>
                <p className="text-muted-foreground">
                  Start a conversation or try one of the suggestions
                </p>
              </div>
            </div>
          ) : (
            <MessageList
              messages={messages}
              isLoading={isLoading}
              stop={stop}
              reload={reload}
              artifacts={artifacts}
              setSelectedArtifactId={setSelectedArtifactId}
            />
          )}
        </div>

        {/* Input Area */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <form onSubmit={handleFormSubmit} className="relative">
              <div className="flex items-end gap-2">
                {/* Model Selector */}
                <ModelSelector
                  modelId={modelId}
                  onModelChange={setModelId}
                />

                {/* Input Field */}
                <div className="flex-1 relative">
                  <MultimodalInput
                    input={input}
                    setInput={setInput}
                    attachments={attachments}
                    setAttachments={setAttachments}
                    handleSubmit={handleFormSubmit}
                    isLoading={isLoading}
                    stop={stop}
                    onPaste={handlePaste}
                    fileInputRef={fileInputRef}
                    handleFileSelect={handleFileSelect}
                    supportsVision={supportsVision}
                    messages={messages}
                    append={append}
                  />
                </div>

                {/* Submit Button */}
                {isLoading ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={stop}
                    className="mb-1"
                  >
                    <CircleStop className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() && attachments.length === 0}
                    className="mb-1"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Artifacts Panel */}
      <AnimatePresence>
        {showArtifacts && (
          <motion.div
            initial={{ x: artifactsWidth }}
            animate={{ x: 0 }}
            exit={{ x: artifactsWidth }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full border-l bg-background"
            style={{ width: artifactsWidth }}
          >
            <Artifacts
              artifacts={artifacts}
              selectedArtifactId={selectedArtifactId}
              setSelectedArtifactId={setSelectedArtifactId}
              setArtifacts={setArtifacts}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating New Chat Button */}
      {messages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-20 right-4 z-50"
        >
          <Button
            onClick={handleNewChat}
            size="icon"
            className="rounded-full shadow-lg"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Data Stream Handler */}
      {id && <DataStreamHandler streamData={data} />}
    </div>
  );
}