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
      name: 'author',
      title: 'Author',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Trip Date',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'object',
      fields: [
        defineField({
          name: 'name',
          title: 'Location Name',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'region',
          title: 'Region',
          type: 'string',
        }),
        defineField({
          name: 'coordinates',
          title: 'Coordinates',
          type: 'geopoint',
        }),
      ],
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 5,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'image' }],
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Hiking', value: 'hiking' },
          { title: 'Skiing', value: 'skiing' },
          { title: 'Climbing', value: 'climbing' },
          { title: 'Camping', value: 'camping' },
          { title: 'Backpacking', value: 'backpacking' },
          { title: 'Mountaineering', value: 'mountaineering' },
          { title: 'Trail Running', value: 'trail-running' },
          { title: 'Biking', value: 'biking' },
        ],
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
      author: 'author',
      media: 'images.0',
    },
    prepare({ title, author, media }) {
      return {
        title,
        subtitle: `By ${author}`,
        media,
      };
    },
  },
});
