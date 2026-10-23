/**
 * Files attached to a lead, contact, organization or deal: what is accepted, how a file is checked,
 * what it is stored as, and who may remove it. Pure (no database, no storage), so the rules are
 * tested on their own and shared by the upload action, the download route and the screen.
 *
 * A file is trusted by its BYTES, never by its name or the browser's claimed type: a ".pdf" that
 * does not start like a PDF is refused. Anything that could run in a browser (HTML, SVG, scripts)
 * or on a computer (executables, archives, macro documents) is not accepted at all.
 */

export const CRM_FILES_BUCKET = "crm-files";

/**
 * Largest file accepted. Uploads travel through a Server Action, and hosts cap request bodies
 * (Vercel: 4.5 MB), so this stays a little under that, the same as the image library.
 */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** A record can hold this many files: enough for real work, and a bound on what one record can cost. */
export const MAX_FILES_PER_RECORD = 50;

export type FileKind = "pdf" | "image" | "document" | "spreadsheet" | "presentation" | "text";

export interface FileTypeInfo {
  ext: string;
  mime: string;
  kind: FileKind;
}

/** Every accepted extension, and the type it is stored as. */
const TYPES: Record<string, FileTypeInfo> = {
  pdf: { ext: "pdf", mime: "application/pdf", kind: "pdf" },
  png: { ext: "png", mime: "image/png", kind: "image" },
  jpg: { ext: "jpg", mime: "image/jpeg", kind: "image" },
  jpeg: { ext: "jpg", mime: "image/jpeg", kind: "image" },
  webp: { ext: "webp", mime: "image/webp", kind: "image" },
  docx: {
    ext: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    kind: "document",
  },
  xlsx: {
    ext: "xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    kind: "spreadsheet",
  },
  pptx: {
    ext: "pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    kind: "presentation",
  },
  csv: { ext: "csv", mime: "text/csv", kind: "text" },
  txt: { ext: "txt", mime: "text/plain", kind: "text" },
};

/** For the file picker and the help text. */
export const ACCEPTED_EXTENSIONS = Object.keys(TYPES).map((ext) => `.${ext}`);
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");
export const ACCEPTED_LABEL = "PDF, images (PNG, JPG, WebP), Word, Excel, PowerPoint, CSV and text";

const startsWith = (bytes: Uint8Array, signature: readonly number[]) =>
  bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);

const ascii = (bytes: Uint8Array, from: number, to: number) =>
  String.fromCharCode(...bytes.subarray(from, to));

const SIGNATURE = {
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpeg: [0xff, 0xd8, 0xff],
  zip: [0x50, 0x4b, 0x03, 0x04], // PK..: Office files are zip packages
} as const;

/** The folder each Office format keeps its content in, so a plain zip renamed ".docx" is refused. */
const OFFICE_FOLDER = { docx: "word/", xlsx: "xl/", pptx: "ppt/" } as const;

function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, 65_536);
  if (sample.includes(0)) return false; // binary
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample);
    return true;
  } catch {
    // A multi-byte character cut by the sample's edge is fine; anything else is not text.
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(sample.subarray(0, sample.length - 3));
      return true;
    } catch {
      return false;
    }
  }
}

export type DetectedFile = { ok: true; type: FileTypeInfo } | { ok: false; reason: string };

/**
 * What a file really is. The extension says which format to check for; the bytes must agree.
 * Returns the type to STORE it as (a ".jpeg" is stored as ".jpg").
 */
export function detectFileType(name: string, bytes: Uint8Array): DetectedFile {
  const ext = name.includes(".") ? name.split(".").pop()!.trim().toLowerCase() : "";
  const type = TYPES[ext];
  if (!type)
    return { ok: false, reason: `Files like this aren't accepted. Use ${ACCEPTED_LABEL}.` };
  if (bytes.length === 0) return { ok: false, reason: "That file is empty." };

  const refused = { ok: false, reason: "The file's contents don't match its type." } as const;
  switch (type.ext) {
    case "pdf":
      return startsWith(bytes, SIGNATURE.pdf) ? { ok: true, type } : refused;
    case "png":
      return startsWith(bytes, SIGNATURE.png) ? { ok: true, type } : refused;
    case "jpg":
      return startsWith(bytes, SIGNATURE.jpeg) ? { ok: true, type } : refused;
    case "webp":
      return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP"
        ? { ok: true, type }
        : refused;
    case "docx":
    case "xlsx":
    case "pptx": {
      if (!startsWith(bytes, SIGNATURE.zip)) return refused;
      const body = Buffer.from(bytes).toString("latin1");
      return body.includes("[Content_Types].xml") && body.includes(OFFICE_FOLDER[type.ext])
        ? { ok: true, type }
        : refused;
    }
    default:
      return looksLikeText(bytes) ? { ok: true, type } : refused;
  }
}

/** The name people see: no folders, no control characters, bounded. Never used as a storage path. */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const limited = cleaned.length > 120 ? cleaned.slice(-120) : cleaned;
  return limited.replace(/^\.+/, "") || "file";
}

const FILE_PATH =
  /^crm\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpg|webp|docx|xlsx|pptx|csv|txt)$/;

/** Stored paths are always `crm/<uuid>.<ext>`: nothing the uploader typed becomes part of a path. */
export const isFilePath = (value: string) => FILE_PATH.test(value);
export const newFilePath = (ext: string) => `crm/${crypto.randomUUID()}.${ext}`;

/** Why this file can't be added to a record, or null when it can. */
export function checkFileUpload(file: { size: number }, existingCount: number): string | null {
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_FILE_BYTES)
    return "That file is larger than 4 MB. Make it smaller and try again.";
  if (existingCount >= MAX_FILES_PER_RECORD) {
    return `A record can hold ${MAX_FILES_PER_RECORD} files. Remove one you no longer need first.`;
  }
  return null;
}

/** The person who added a file can remove it, and so can an administrator. */
export function checkDeleteFile(input: {
  uploadedBy: string | null;
  actorId: string | null;
  canAdminister: boolean;
}): string | null {
  if (input.canAdminister) return null;
  if (input.uploadedBy && input.uploadedBy === input.actorId) return null;
  return "Only the person who added a file, or an administrator, can remove it.";
}

export interface FileSubject {
  leadId?: string;
  contactId?: string;
  organizationId?: string;
  dealId?: string;
}

/** Seeing a record's files needs the same permission as seeing the record; changing them, editing it. */
export function filePermission(subject: FileSubject, mode: "view" | "update") {
  const resource = subject.dealId
    ? "deals"
    : subject.leadId
      ? "leads"
      : subject.organizationId
        ? "organizations"
        : "contacts";
  return `${resource}:${mode}` as const;
}

/** What kind of file a stored mime type is, for the icon. */
export function kindFromMime(mime: string): FileKind {
  const type = Object.values(TYPES).find((entry) => entry.mime === mime);
  return type?.kind ?? "text";
}
