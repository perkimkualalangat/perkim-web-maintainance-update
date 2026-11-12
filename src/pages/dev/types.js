// Shared types for dev page modules

export interface DevEnvConfig {
  [key: string]: string;
}

export interface DevCommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface AiCheckResult {
  id: string;
  label: string;
  ok: boolean;
  durationMs: number;
  output: string;
}

export interface AiStatus {
  configured: boolean;
  model: string;
  modes: string[];
  runtime: string;
  maxContextChars?: number;
  allowedOrigins?: string[];
}

export interface ApiTestResult {
  status: number;
  ok: boolean;
  data: unknown;
  error?: string;
}

export interface DevApiState {
  envConfig: DevEnvConfig;
  aiStatus: AiStatus | null;
  aiChecks: AiCheckResult[];
  runningChecks: boolean;
  apiTest: {
    endpoint: string;
    method: string;
    body: string;
    response: ApiTestResult | null;
    loading: boolean;
  };
  testChat: {
    mode: string;
    messages: Array<{role: string; content: string}>;
    streaming: boolean;
    response: string;
  };
  terminal: {
    buildLog: string;
    testLog: string;
    doctorLog: string;
    runningCmd: string | null;
    customCmd: string;
    activeLogTab: 'build' | 'test' | 'doctor';
  };
}

// Allow-listed commands (must match server config)
export const ALLOWED_COMMANDS = [
  'npm run build',
  'npm run test',
  'npm run doctor',
  'npm run lint',
  'git status',
  'node --version',
  'npm --version',
] as const;

export type AllowedCommand = typeof ALLOWED_COMMANDS[number];

// Tab definitions
export interface DevTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{size?: number}>;
}

export const DEV_TABS: DevTab[] = [
  { id: 'overview', label: 'Ringkasan' },
  { id: 'ai', label: 'AI & Cek' },
  { id: 'api', label: 'Uji API' },
  { id: 'data', label: 'Data Entiti' },
  { id: 'config', label: 'Konfigurasi' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'build', label: 'Build & Test' },
];

// AI Modes (must match server)
export const AI_MODES = [
  { value: 'umum', label: 'Umum' },
  { value: 'chat', label: 'Chat' },
  { value: 'kod', label: 'Kod' },
  { value: 'pelan', label: 'Pelan' },
  { value: 'semak', label: 'Semak' },
] as const;

export type AiMode = typeof AI_MODES[number]['value'];