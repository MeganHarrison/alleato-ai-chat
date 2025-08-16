'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { memo } from 'react';
import { CodeBlock } from './code-block';
import { cn } from '@/lib/utils';

interface MessageContentProps {
  content: string;
  className?: string;
}

export const MessageContent = memo(function MessageContent({
  content,
  className,
}: MessageContentProps) {
  return (
    <ReactMarkdown
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        'prose-p:leading-relaxed prose-pre:p-0',
        'prose-headings:font-semibold',
        className
      )}
      remarkPlugins={[remarkGfm]}
      components={{
        // Code blocks
        pre({ children, ...props }) {
          return <pre {...props}>{children}</pre>;
        },
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          
          if (!inline && language) {
            return (
              <CodeBlock
                language={language}
                value={String(children).replace(/\n$/, '')}
              />
            );
          }
          
          return (
            <code
              className={cn(
                inline && 'bg-muted px-1.5 py-0.5 rounded-md font-mono text-sm'
              )}
              {...props}
            >
              {children}
            </code>
          );
        },
        // Links
        a({ href, children, ...props }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              {...props}
            >
              {children}
            </a>
          );
        },
        // Tables
        table({ children, ...props }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="border-collapse w-full" {...props}>
                {children}
              </table>
            </div>
          );
        },
        // Lists
        ul({ children, ...props }) {
          return (
            <ul className="list-disc pl-6 space-y-1" {...props}>
              {children}
            </ul>
          );
        },
        ol({ children, ...props }) {
          return (
            <ol className="list-decimal pl-6 space-y-1" {...props}>
              {children}
            </ol>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
});