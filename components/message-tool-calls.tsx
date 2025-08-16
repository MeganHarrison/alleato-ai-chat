'use client';

import { ToolInvocation } from 'ai';
import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, FileText, Sparkles, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Weather } from './weather';
import { DocumentPreview } from './document-preview';

interface MessageToolCallsProps {
  toolCalls: ToolInvocation[];
  artifacts: Array<{ id: string; title: string; kind: string }>;
  setSelectedArtifactId: (id: string) => void;
}

export const MessageToolCalls = memo(function MessageToolCalls({
  toolCalls,
  artifacts,
  setSelectedArtifactId,
}: MessageToolCallsProps) {
  return (
    <div className="space-y-2">
      {toolCalls.map((toolCall, index) => (
        <ToolCall
          key={`${toolCall.toolCallId}-${index}`}
          toolCall={toolCall}
          artifacts={artifacts}
          setSelectedArtifactId={setSelectedArtifactId}
        />
      ))}
    </div>
  );
});

function ToolCall({
  toolCall,
  artifacts,
  setSelectedArtifactId,
}: {
  toolCall: ToolInvocation;
  artifacts: Array<{ id: string; title: string; kind: string }>;
  setSelectedArtifactId: (id: string) => void;
}) {
  const { toolName, state, args, result } = toolCall;
  const isLoading = state === 'call';
  const hasResult = state === 'result';

  // Handle weather tool
  if (toolName === 'getWeather') {
    if (isLoading) {
      return (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Getting weather...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="skeleton">
              <Weather />
            </div>
          </CardContent>
        </Card>
      );
    }

    if (hasResult && result) {
      return <Weather weatherAtLocation={result} />;
    }
  }

  // Handle document creation
  if (toolName === 'createDocument') {
    if (isLoading || !hasResult) {
      return (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Creating document...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentPreview isReadonly={false} args={args} />
          </CardContent>
        </Card>
      );
    }

    if (hasResult && result) {
      if ('error' in result) {
        return (
          <Card className="overflow-hidden border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                Error: {String(result.error)}
              </p>
            </CardContent>
          </Card>
        );
      }

      return <DocumentPreview isReadonly={false} result={result} />;
    }
  }

  // Handle document update
  if (toolName === 'updateDocument') {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {isLoading ? 'Updating document...' : 'Document updated'}
          </CardTitle>
        </CardHeader>
        {hasResult && result && 'error' in result && (
          <CardContent>
            <p className="text-sm text-destructive">
              Error: {String(result.error)}
            </p>
          </CardContent>
        )}
      </Card>
    );
  }

  // Handle suggestions request
  if (toolName === 'requestSuggestions') {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {isLoading ? 'Getting suggestions...' : 'Suggestions ready'}
          </CardTitle>
        </CardHeader>
        {hasResult && result && 'error' in result && (
          <CardContent>
            <p className="text-sm text-destructive">
              Error: {String(result.error)}
            </p>
          </CardContent>
        )}
      </Card>
    );
  }

  // Generic tool display
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {toolName}
        </CardTitle>
      </CardHeader>
      {args && (
        <CardContent>
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(args, null, 2)}
          </pre>
        </CardContent>
      )}
    </Card>
  );
}