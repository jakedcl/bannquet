import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'tripReport',
  title: 'Trip Report',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'authorName',
      title: 'Author Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'authorEmail',
      title: 'Author Email',
      type: 'string',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: false,
      description: 'Trip report is only visible when published is true',
    }),
    defineField({
      name: 'tripDate',
      title: 'Trip Date',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'locationPin',
      title: 'Location Pin',
      type: 'geopoint',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H1', value: 'h1' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Code', value: 'code' },
            ],
            annotations: [
              {
                title: 'URL',
                name: 'link',
                type: 'object',
                fields: [
                  {
                    title: 'URL',
                    name: 'href',
                    type: 'url',
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          fields: [
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
              options: {
                isHighlighted: true,
              },
            },
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              options: {
                isHighlighted: true,
              },
            },
          ],
          options: {
            hotspot: true,
          },
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Trail Running', value: 'trail-running' },
          { title: 'Hiking', value: 'hiking' },
          { title: 'Mountaineering', value: 'mountaineering' },
          { title: 'Climbing', value: 'climbing' },
          { title: 'Ice Climbing', value: 'ice-climb' },
          { title: 'Scramble', value: 'scramble' },
          { title: 'Bike', value: 'bike' },
          { title: 'Ski/Split Tour', value: 'ski-split-tour' },
          { title: 'Backpacking', value: 'backpacking' },
          { title: 'Camping', value: 'camping' },
          { title: 'Snowshoeing', value: 'snowshoeing' },
          { title: 'Rock Climbing', value: 'rock-climbing' },
        ],
        layout: 'tags',
      },
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      author: 'authorName',
      media: 'body',
    },
    prepare({ title, author, media }) {
      // Find first image in body for preview
      const firstImage = media?.find((item: any) => item._type === 'image');
      return {
        title,
        subtitle: `By ${author}`,
        media: firstImage,
      };
    },
  },
});
