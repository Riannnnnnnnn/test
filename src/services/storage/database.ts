import { openDB, type DBSchema } from "idb";
import type { AssessmentSession, StudentProfile } from "@/types";
import type { SiteContent } from "@/content/types";

interface AssessmentDatabase extends DBSchema {
  students: {
    key: string;
    value: StudentProfile;
    indexes: { "by-date": string };
  };
  sessions: {
    key: string;
    value: AssessmentSession;
    indexes: { "by-student": string; "by-start-time": string };
  };
  audio: {
    key: string;
    value: { id: string; blob: Blob; createdAt: string };
  };
  content: {
    key: string;
    value: { id: string; value: SiteContent; updatedAt: string };
  };
}

const databasePromise = openDB<AssessmentDatabase>("children-speech-assessment-v2", 3, {
  upgrade(database) {
    if (!database.objectStoreNames.contains("students")) {
      const students = database.createObjectStore("students", { keyPath: "id" });
      students.createIndex("by-date", "assessmentDate");
    }
    if (!database.objectStoreNames.contains("sessions")) {
      const sessions = database.createObjectStore("sessions", { keyPath: "id" });
      sessions.createIndex("by-student", "studentId");
      sessions.createIndex("by-start-time", "startTime");
    }
    if (!database.objectStoreNames.contains("audio")) database.createObjectStore("audio", { keyPath: "id" });
    if (!database.objectStoreNames.contains("content")) database.createObjectStore("content", { keyPath: "id" });
  },
});

export async function saveStudent(student: StudentProfile): Promise<void> {
  const database = await databasePromise;
  await database.put("students", student);
}

export async function getStudent(id: string): Promise<StudentProfile | undefined> {
  const database = await databasePromise;
  return database.get("students", id);
}

export async function saveSession(session: AssessmentSession): Promise<void> {
  const database = await databasePromise;
  await database.put("sessions", session);
}

export async function getSession(id: string): Promise<AssessmentSession | undefined> {
  const database = await databasePromise;
  return database.get("sessions", id);
}

export async function listSessions(): Promise<AssessmentSession[]> {
  const database = await databasePromise;
  return database.getAllFromIndex("sessions", "by-start-time");
}

export async function listStudents(): Promise<StudentProfile[]> {
  const database = await databasePromise;
  return database.getAllFromIndex("students", "by-date");
}

export async function deleteStudentHistory(studentId: string): Promise<void> {
  const database = await databasePromise;
  const transaction = database.transaction(["students", "sessions", "audio"], "readwrite");
  const sessions = await transaction.objectStore("sessions").index("by-student").getAll(studentId);
  for (const session of sessions) {
    for (const result of session.results) {
      if (result.audioFile) await transaction.objectStore("audio").delete(result.audioFile);
    }
    await transaction.objectStore("sessions").delete(session.id);
  }
  await transaction.objectStore("students").delete(studentId);
  await transaction.done;
}

export async function saveAudio(id: string, blob: Blob): Promise<void> {
  const database = await databasePromise;
  await database.put("audio", { id, blob, createdAt: new Date().toISOString() });
}

export async function getAudio(id: string): Promise<Blob | undefined> {
  const database = await databasePromise;
  return (await database.get("audio", id))?.blob;
}

export async function saveSiteContent(value: SiteContent): Promise<void> {
  const database = await databasePromise;
  await database.put("content", { id: "site-content", value, updatedAt: new Date().toISOString() });
}

export async function getSiteContent(): Promise<SiteContent | undefined> {
  const database = await databasePromise;
  return (await database.get("content", "site-content"))?.value;
}
