'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ProjectEmbedProps {
  url: string;
  title: string;
  height?: string;
  className?: string;
}

export default function ProjectEmbed({ 
  url, 
  title, 
  height = '600px',
  className = '' 
}: ProjectEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <p className="text-gray-500">Loading {title}...</p>
        </div>
      )}
      <motion.iframe
        src={url}
        title={title}
        width="100%"
        height={height}
        className="rounded-lg shadow-sm bg-white"
        onLoad={() => setIsLoading(false)}
        style={{ border: 'none' }}
      />
    </div>
  );
} 