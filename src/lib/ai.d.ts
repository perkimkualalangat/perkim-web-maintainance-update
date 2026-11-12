export interface StreamEvent {
  type: 'delta' | 'done' | 'error' | 'meta' | 'thinking';
  data: string;
}

export interface AiStatus {
  configured: boolean;
  model: string;
  modes: string[];
  runtime: string;
  maxContextChars?: number;
  allowedOrigins?: string[];
}

export interface SystemCheckResult {
  id: string;
  label: string;
  ok: boolean;
  durationMs: number;
  output: string;
}

export interface SystemCheckReport {
  ok: boolean;
  checkedAt: string;
  durationMs: number;
  results: SystemCheckResult[];
}

export async function getAiStatus(signal?: AbortSignal): Promise<AiStatus>;

export async function runSystemChecks(signal?: AbortSignal): Promise<SystemCheckReport>;

export function buildResearchContext(data: Record<string, any>, query: string): string;

export async function streamAi(
  params: {
    mode: string;
    locale: string;
    messages: Array<{ role: string; content: string }>;
    context: string;
    signal: AbortSignal | null;
  },
  callbacks: {
    onDelta?: (text: string) => void;
    onMeta?: (meta: any) => void;
    onThinking?: (active: boolean) => void;
  }
): AsyncGenerator<StreamEvent>;