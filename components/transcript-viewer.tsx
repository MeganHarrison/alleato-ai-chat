'use client';

import { useState, useEffect } from 'react';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TranscriptViewerProps {
  transcriptUrl?: string;
  firefliesUrl?: string;
  meetingData: any;
}

export function TranscriptViewer({ 
  transcriptUrl, 
  firefliesUrl, 
  meetingData 
}: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transcriptUrl) {
      fetchTranscript();
    } else {
      setLoading(false);
      setError('No transcript URL available');
    }
  }, [transcriptUrl]);

  const fetchTranscript = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // If it's a markdown file URL, fetch it
      const response = await fetch(transcriptUrl!);
      if (!response.ok) {
        throw new Error('Failed to fetch transcript');
      }
      
      const text = await response.text();
      setTranscript(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!transcript) return;
    
    const blob = new Blob([transcript], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meetingData.title || 'meeting'}-transcript.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading transcript...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex gap-4">
        <Button onClick={handleDownload} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download Transcript
        </Button>
        
        {firefliesUrl && (
          <Button
            onClick={() => window.open(firefliesUrl, '_blank')}
            variant="outline"
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View in Fireflies
          </Button>
        )}
      </div>

      {/* Summary section if available */}
      {meetingData.summary && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Summary</h2>
          <p className="text-gray-700 dark:text-gray-300">{meetingData.summary}</p>
        </Card>
      )}

      {/* Action items if available */}
      {meetingData.action_items && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Action Items</h2>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{meetingData.action_items}</ReactMarkdown>
          </div>
        </Card>
      )}

      {/* Transcript content */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Full Transcript
        </h2>
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              // Custom renderers for better formatting
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold mt-5 mb-3">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-4 leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 my-4 italic">
                  {children}
                </blockquote>
              ),
              code: ({ inline, children }) => 
                inline ? (
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">
                    {children}
                  </code>
                ) : (
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                    <code>{children}</code>
                  </pre>
                ),
            }}
          >
            {transcript}
          </ReactMarkdown>
        </div>
      </Card>
    </div>
  );
}