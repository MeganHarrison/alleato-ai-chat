import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db/drizzle';
import { D1QueryBuilder } from '@/lib/d1/query-builder';
import { auth } from '@/lib/auth';
import { TranscriptViewer } from '@/components/transcript-viewer';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function TranscriptPage({ params }: PageProps) {
  const session = await auth();
  
  if (!session?.user) {
    notFound();
  }

  const { id } = params;
  
  // Fetch meeting data
  const db = await getDb();
  const queryBuilder = new D1QueryBuilder(db as any);
  
  const result = await queryBuilder.select('meetings', {
    filters: { id },
    limit: 1,
  });

  const meeting = result.results[0];
  
  if (!meeting) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {meeting.title || 'Meeting Transcript'}
        </h1>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Date: {new Date(meeting.date).toLocaleDateString()}</span>
          {meeting.duration && <span>Duration: {meeting.duration} minutes</span>}
        </div>
      </div>

      <TranscriptViewer 
        transcriptUrl={meeting.transcript_url}
        firefliesUrl={meeting.fireflies_url}
        meetingData={meeting}
      />
    </div>
  );
}