import { create } from "zustand";
import type { AssessmentSession, StudentProfile } from "@/types";

interface AssessmentStore {
  student: StudentProfile | null;
  session: AssessmentSession | null;
  setStudent: (student: StudentProfile) => void;
  setSession: (session: AssessmentSession) => void;
  clear: () => void;
}

export const useAssessmentStore = create<AssessmentStore>((set) => ({
  student: null,
  session: null,
  setStudent: (student) => set({ student }),
  setSession: (session) => set({ session }),
  clear: () => set({ student: null, session: null }),
}));
