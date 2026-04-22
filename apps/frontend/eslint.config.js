import { config as reactInternalConfig } from '@repo/eslint-config/react-internal';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import reactRefresh from 'eslint-plugin-react-refresh';

export default defineConfig([
  globalIgnores(['dist']),
  ...reactInternalConfig,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactRefresh.configs.vite.rules
    }
  },
  {
    files: ['vite.config.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      globals: globals.node
    }
  }
]);
