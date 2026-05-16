export type CallStatus = "pending" | "processing" | "completed" | "error";

export type Speaker = "Asistan" | "Borçlu";

export interface TranscriptLine {
  speaker: Speaker;
  text: string;
}

export interface ComplianceViolation {
  rule: string;
  detail: string;
  critical: boolean;
}

export interface ComplianceResult {
  score: number;
  compliant: boolean;
  summary: string;
  violations: ComplianceViolation[];
  positives: string[];
  checkedAt?: Date;
}

export interface CallRecord {
  id: string;
  fileName: string;
  driveFileId: string;
  folderDate: string;
  transcript: string;
  transcriptLines?: TranscriptLine[];
  summary: string;
  status: CallStatus;
  saved?: boolean;
  fileSizeBytes?: number;
  compliance?: ComplianceResult;
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
}

export interface ProcessResult {
  success: boolean;
  processed: number;
  errors: number;
  details: Array<{
    fileName: string;
    status: "completed" | "error";
    error?: string;
  }>;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}
