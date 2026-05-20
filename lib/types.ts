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
  notEvaluable?: boolean;
  summary: string;
  violations: ComplianceViolation[];
  warnings: string[];
  positives: string[];
  checkedAt?: Date;
}

export interface SubjectInfo {
  name?: string;      // Borçlunun adı soyadı
  tcNo?: string;      // TC kimlik numarası (11 hane)
  icraOffice?: string; // İcra müdürlüğü
  fileNo?: string;    // Dosya numarası
}

export interface CallRecord {
  id: string;
  fileName: string;
  driveFileId: string;
  folderDate: string;
  agentName?: string;
  subjectInfo?: SubjectInfo;
  estimatedDurationSeconds?: number;
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
  step2Tokens?: number;
  step3Tokens?: number;
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
  durationMillis?: string;
}
