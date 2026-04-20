import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import tripReport from './schemas/tripReport';

export default defineConfig({
  name: 'bannquet',
  title: 'Bannquet Studio',
  
  projectId: '042pyqmm',
  dataset: 'production',
  
  plugins: [structureTool()],
  
  schema: {
    types: [tripReport],
  },
});
