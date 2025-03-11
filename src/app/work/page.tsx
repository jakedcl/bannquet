'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import PageWrapper from '@/components/ui/PageWrapper';
import { projects } from '@/lib/projects';

export default function ProjectsPage() {
  return (
    <PageWrapper className="bg-brand-green min-h-[calc(100vh-72px)]">
      <div className="max-w-container mx-auto px-4 py-16">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold text-white mb-8"
        >
          Projects
        </motion.h1>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
          {projects
            .filter(project => project.type !== 'iframe' && project.type !== 'static')
            .map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={project.link} className="group block">
                <div className="bg-white rounded-lg overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
                  <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 group-hover:text-brand-green transition-colors">
                      {project.title}
                    </h2>
                    <p className="mt-2 text-gray-700">
                      {project.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {project.tags.map(tag => (
                        <span 
                          key={tag}
                          className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
} 