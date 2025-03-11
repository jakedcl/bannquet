'use client';

import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { projects } from '@/lib/projects';
import PageWrapper from '@/components/ui/PageWrapper';
import ProjectEmbed from '@/components/projects/ProjectEmbed';
import { notFound } from 'next/navigation';

export default function ProjectPage() {
  const { projectId } = useParams();
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return notFound();
  }

  const renderProjectContent = () => {
    switch (project.type) {
      case 'nextjs':
        // For Next.js projects like the weather dashboard, render their components directly
        if (project.id === 'mountain-weather') {
          return (
            <div className="mt-16">
              {/* Your existing mountain weather content */}
            </div>
          );
        }
        break;

      case 'iframe':
        if (project.demoUrl) {
          return (
            <ProjectEmbed 
              url={project.demoUrl}
              title={project.title}
              className="mt-16"
            />
          );
        }
        break;

      case 'static':
        if (project.staticPath) {
          return (
            <ProjectEmbed 
              url={project.staticPath}
              title={project.title}
              className="mt-16"
            />
          );
        }
        break;

      case 'github':
        return (
          <div className="mt-16 text-center">
            <a 
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-brand-green text-white px-8 py-4 rounded-lg 
                font-medium hover:bg-brand-green-light transition-colors"
            >
              View on GitHub
            </a>
          </div>
        );
    }
  };

  return (
    <PageWrapper className="bg-gray-50">
      <div className="max-w-container mx-auto px-4 py-16">
        {/* Project Header */}
        <div className="max-w-content mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              {project.title}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              {project.description}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {project.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Project Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {renderProjectContent()}
        </motion.div>
      </div>
    </PageWrapper>
  );
} 