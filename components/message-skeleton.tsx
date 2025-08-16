'use client';

import { Bot } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';

export function MessageSkeleton() {
  return (
    <div className="group relative flex gap-4 animate-pulse">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback>
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <div className="bg-muted/50 rounded-2xl px-4 py-3">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}