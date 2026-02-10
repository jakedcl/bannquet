import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'tripReportVerification',
  title: 'Trip Report Verification',
  type: 'document',
  fields: [
    defineField({
      name: 'tripReportId',
      title: 'Trip Report ID',
      type: 'reference',
      to: [{ type: 'tripReport' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: 'verificationToken',
      title: 'Verification Token (publish)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'editToken',
      title: 'Edit Token (permanent)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'expiresAt',
      title: 'Expires At',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      email: 'email',
      tripReport: 'tripReportId.title',
    },
    prepare({ email, tripReport }) {
      return {
        title: email,
        subtitle: `Verification for: ${tripReport || 'Unknown'}`,
      };
    },
  },
});
