import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import tripReport from './schemas/tripReport';

export default defineConfig({
  name: 'bannquet',
  title: 'Bannquet Studio',
  
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  
  plugins: [structureTool()],
  
  schema: {
    types: [tripReport],
  },
});
