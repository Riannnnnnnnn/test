export interface ReportExportService { exportReport(sessionId: string): Promise<void>; }
export class BrowserPrintExportService implements ReportExportService { async exportReport(sessionId: string): Promise<void> { void sessionId; window.print(); } }

export * from "./reportImage";
export * from "./reportShare";
