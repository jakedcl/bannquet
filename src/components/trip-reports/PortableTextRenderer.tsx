'use client';

import { PortableText } from '@portabletext/react';
import { getImageUrl } from '@/lib/sanity';

interface PortableTextRendererProps {
  content: any[];
}

export default function PortableTextRenderer({ content }: PortableTextRendererProps) {
  if (!content || !Array.isArray(content)) {
    return null;
  }

  return (
    <div className="prose prose-lg max-w-none">
      <PortableText
        value={content}
        components={{
          types: {
            image: ({ value }: any) => {
              const imageUrl = value?.asset?._ref 
                ? getImageUrl(
                    {
                      asset: {
                        _ref: value.asset._ref,
                        _type: 'reference',
                      },
                    },
                    1200,
                    800
                  )
                : null;

              if (!imageUrl) return null;

              return (
                <figure className="my-8">
                  <img
                    src={imageUrl}
                    alt={value.alt || 'Trip photo'}
                    className="w-full rounded-lg"
                  />
                  {value.caption && (
                    <figcaption className="mt-2 text-sm text-gray-600 text-center italic">
                      {value.caption}
                    </figcaption>
                  )}
                </figure>
              );
            },
          },
          block: {
            h1: ({ children }) => <h1 className="text-4xl font-bold mt-8 mb-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-3xl font-bold mt-6 mb-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-2xl font-bold mt-4 mb-2">{children}</h3>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-brand-green pl-4 italic my-4 text-gray-700">
                {children}
              </blockquote>
            ),
            normal: ({ children }) => <p className="mb-4 leading-relaxed text-gray-700">{children}</p>,
          },
          marks: {
            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            code: ({ children }) => (
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{children}</code>
            ),
            link: ({ value, children }) => (
              <a
                href={value?.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-green hover:underline"
              >
                {children}
              </a>
            ),
          },
        }}
      />
    </div>
  );
}
