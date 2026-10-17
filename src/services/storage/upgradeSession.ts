import type { AssessmentSession, AssessmentResult } from "@/types";

/** Only unfinished assessments adopt the current course; completed reports remain historical. */
export function upgradeSession(session: AssessmentSession): AssessmentSession {
  if (session.courseVersion === 3 || session.status === "completed") return session;
  const stage = session.stage === "A" ? "A" : "B";
  const results: AssessmentResult[] = ["A1", "A2", "A5"].map((moduleId) => {
    const previous = session.results.find((result) => result.moduleId === moduleId);
    const result: AssessmentResult = previous ?? { moduleId, questionId: `${moduleId}-001`, status: "not_started" };
    if (stage !== "A" || !previous || moduleId === "A2") return result;
    const itemId = moduleId === "A1" ? "A1-p" : "A5-tiger";
    return { ...result, activeItemId: itemId, items: { [itemId]: { ...result, questionId: itemId } } };
  });
  return { ...session, stage, courseVersion: 3, legacyResults: session.results, results };
}
