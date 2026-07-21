import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the root of the project or shared folder for local development
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

export default defineConfig({
  schema: './schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL!,
  },
});
