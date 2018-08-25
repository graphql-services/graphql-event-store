import { config } from 'dotenv';

config({});

interface IENV {
  DATABASE_URL: string;
  NODE_ENV: string;
  NSQ_URL: string;
  PORT: number | string;
}

export const ENV: IENV = process.env as any;
