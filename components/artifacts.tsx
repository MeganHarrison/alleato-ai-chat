'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Artifact } from './artifact';

interface ArtifactsProps {
  artifacts: Array<{ id: string; title: string; kind: string }>;
  selectedArtifactId: string;
  setSelectedArtifactId: (id: string) => void;
}

export function Artifacts({ artifacts, selectedArtifactId, setSelectedArtifactId }: ArtifactsProps) {
  if (artifacts.length === 0) return null;

  const selectedArtifact = artifacts.find(a => a.id === selectedArtifactId);

  return (
    <AnimatePresence mode="wait">
      {selectedArtifact && (
        <motion.div
          key={selectedArtifact.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-hidden"
        >
          <Artifact
            artifact={selectedArtifact}
            onClose={() => setSelectedArtifactId('')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}