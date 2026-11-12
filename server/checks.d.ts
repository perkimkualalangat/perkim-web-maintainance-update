export interface CheckResult {
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
  results: CheckResult[];
}

export async function runSystemChecks(): Promise<SystemCheckReport>;