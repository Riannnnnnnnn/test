import type { ComponentType } from "react";
import { AnimalImitation, Breathing, PictureSequence, Pronunciation, ScenarioResponse } from "./stageA";
import type { AssessmentModuleProps } from "./types";

export const assessmentModuleRegistry: Record<string, ComponentType<AssessmentModuleProps>> = {
  A1: Pronunciation,
  A2: Breathing,
  A3: PictureSequence,
  A4: ScenarioResponse,
  A5: AnimalImitation,
};
