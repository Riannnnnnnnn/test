import type { GradeLevel, StageId } from "@/types";

export interface SharedReportPayload {
  version: 1;
  courseVersion?: 3;
  student: {
    name: string;
    age: number;
    grade: GradeLevel;
    assessmentDate: string;
  };
  stage: StageId;
  abilityValues: Record<string, number>;
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSharedReport(payload: SharedReportPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeSharedReport(value: string | null): SharedReportPayload | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(fromBase64Url(value)) as Partial<SharedReportPayload>;
    if (parsed.version !== 1 || !parsed.student?.name || !parsed.stage || !parsed.abilityValues) return undefined;
    return parsed as SharedReportPayload;
  } catch {
    return undefined;
  }
}
