import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Ignorar artefactos generados (build de Vite y de Capacitor/Android)
  globalIgnores(['dist', 'android', 'ios', 'node_modules', '*.config.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      /* ── Reglas experimentales del React Compiler (eslint-plugin-react-hooks v7 RC) ──
         Este proyecto NO usa React Compiler. Estas reglas marcan patrones legítimos
         (fetch-en-effect, memoización manual, etc.) que funcionan correctamente.
         Se desactivan para no generar ruido; las reglas clásicas (rules-of-hooks y
         exhaustive-deps) SÍ se mantienen activas. */
      'react-hooks/set-state-in-effect':          'off',
      'react-hooks/preserve-manual-memoization':  'off',
      'react-hooks/immutability':                 'off',
      'react-hooks/refs':                         'off',
      'react-hooks/incompatible-library':         'off',
      'react-hooks/preserve-caught-error':        'off',
      /* Dependencias de hooks: aviso (no bloquea) */
      'react-hooks/exhaustive-deps':              'warn',
      /* Fast Refresh (solo dev): los archivos de contexto exportan hook + provider
         a propósito; es un patrón estándar de React, no un error. */
      'react-refresh/only-export-components':     'warn',
      /* Variables sin usar: error, ignorando las que empiezan con _ */
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern:        '^_',
        varsIgnorePattern:        '^_',
        caughtErrorsIgnorePattern:'^_',
      }],
    },
  },
])
