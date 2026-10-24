import { describe, expect, it } from "vitest";

import {
  ACCEPT_ATTRIBUTE,
  MAX_FILES_PER_RECORD,
  MAX_FILE_BYTES,
  checkDeleteFile,
  checkFileUpload,
  detectFileType,
  filePermission,
  isFilePath,
  newFilePath,
  sanitizeFileName,
} from "./files";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);
const pdf = () => text("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n");
const png = () => bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0);
const jpeg = () => bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10);
const webp = () => text("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ");
/** A minimal Office package: a zip whose entries include the content types and the format's folder. */
const office = (folder: string) =>
  Uint8Array.from([0x50, 0x4b, 0x03, 0x04, ...text(`[Content_Types].xml ${folder}document.xml`)]);

describe("detectFileType", () => {
  it("accepts each format when the bytes agree with the name", () => {
    expect(detectFileType("quote.pdf", pdf())).toMatchObject({ ok: true, type: { ext: "pdf" } });
    expect(detectFileType("shot.png", png())).toMatchObject({ ok: true, type: { ext: "png" } });
    expect(detectFileType("shot.jpg", jpeg())).toMatchObject({ ok: true, type: { ext: "jpg" } });
    expect(detectFileType("shot.webp", webp())).toMatchObject({ ok: true, type: { ext: "webp" } });
    expect(detectFileType("brief.docx", office("word/"))).toMatchObject({
      ok: true,
      type: { kind: "document" },
    });
    expect(detectFileType("plan.xlsx", office("xl/"))).toMatchObject({
      ok: true,
      type: { kind: "spreadsheet" },
    });
    expect(detectFileType("deck.pptx", office("ppt/"))).toMatchObject({
      ok: true,
      type: { kind: "presentation" },
    });
    expect(detectFileType("rows.csv", text("a,b\n1,2\n"))).toMatchObject({
      ok: true,
      type: { ext: "csv" },
    });
    expect(detectFileType("notes.txt", text("héllo wörld ✓"))).toMatchObject({ ok: true });
  });

  it("stores a .jpeg as .jpg, and reads the extension in any letter case", () => {
    expect(detectFileType("PHOTO.JPEG", jpeg())).toMatchObject({ ok: true, type: { ext: "jpg" } });
  });

  it("trusts the bytes, not the name: a renamed file is refused", () => {
    const wrong = { ok: false, reason: "The file's contents don't match its type." };
    expect(detectFileType("invoice.pdf", text("MZ\u0090\u0000 this is a program"))).toEqual(wrong);
    expect(detectFileType("pic.png", jpeg())).toEqual(wrong);
    expect(detectFileType("pic.jpg", png())).toEqual(wrong);
    expect(detectFileType("pic.webp", png())).toEqual(wrong);
    // A plain zip renamed to Word, and an Office file renamed to a different Office type.
    expect(detectFileType("a.docx", Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]))).toEqual(
      wrong,
    );
    expect(detectFileType("a.docx", office("xl/"))).toEqual(wrong);
    expect(detectFileType("a.csv", bytes(0x50, 0x4b, 0x03, 0x04, 0x00, 0x01))).toEqual(wrong);
  });

  it("refuses everything that could run, however it is named", () => {
    for (const name of [
      "setup.exe",
      "page.html",
      "logo.svg",
      "run.js",
      "macro.docm",
      "bundle.zip",
      "script.sh",
      "shortcut.lnk",
      "noextension",
      "trailingdot.",
    ]) {
      const result = detectFileType(name, text("hello"));
      expect(result.ok, name).toBe(false);
    }
  });

  it("refuses an empty file, and text that is really binary", () => {
    expect(detectFileType("empty.pdf", bytes())).toMatchObject({ ok: false, reason: /empty/ });
    expect(detectFileType("bin.txt", bytes(0x68, 0x00, 0x69))).toMatchObject({ ok: false });
    expect(detectFileType("bad.txt", bytes(0xff, 0xfe, 0xfd, 0xfc, 0xfb))).toMatchObject({
      ok: false,
    });
  });

  it("offers every accepted type to the file picker", () => {
    for (const ext of [".pdf", ".png", ".docx", ".csv", ".txt"]) {
      expect(ACCEPT_ATTRIBUTE).toContain(ext);
    }
    expect(ACCEPT_ATTRIBUTE).not.toContain(".html");
  });
});

describe("sanitizeFileName", () => {
  it("drops folders and control characters, and keeps what people recognise", () => {
    expect(sanitizeFileName("C:\\Users\\me\\Quote  final.pdf")).toBe("C:_Users_me_Quote final.pdf");
    expect(sanitizeFileName("../../etc/passwd")).toBe("_.._etc_passwd");
    expect(sanitizeFileName("a\u0000b\nc.txt")).toBe("abc.txt");
    expect(sanitizeFileName("...hidden")).toBe("hidden");
    expect(sanitizeFileName("   ")).toBe("file");
  });

  it("bounds the length, keeping the end where the extension is", () => {
    const long = `${"x".repeat(300)}.pdf`;
    const clean = sanitizeFileName(long);
    expect(clean.length).toBe(120);
    expect(clean.endsWith(".pdf")).toBe(true);
  });
});

describe("storage paths", () => {
  it("are random, and only that shape is ever accepted back", () => {
    const path = newFilePath("pdf");
    expect(isFilePath(path)).toBe(true);
    expect(path).not.toBe(newFilePath("pdf"));
    for (const bad of [
      "crm/../x.pdf",
      "crm/not-a-uuid.pdf",
      "other/00000000-0000-4000-8000-000000000000.pdf",
      "crm/00000000-0000-4000-8000-000000000000.exe",
      "crm/00000000-0000-4000-8000-000000000000.pdf/extra",
      "",
    ]) {
      expect(isFilePath(bad), bad).toBe(false);
    }
  });
});

describe("checkFileUpload", () => {
  it("allows a normal file", () => {
    expect(checkFileUpload({ size: 1000 }, 0)).toBeNull();
    expect(checkFileUpload({ size: MAX_FILE_BYTES }, MAX_FILES_PER_RECORD - 1)).toBeNull();
  });

  it("refuses an empty file, one over the size cap, and a full record", () => {
    expect(checkFileUpload({ size: 0 }, 0)).toMatch(/empty/);
    expect(checkFileUpload({ size: MAX_FILE_BYTES + 1 }, 0)).toMatch(/4 MB/);
    expect(checkFileUpload({ size: 10 }, MAX_FILES_PER_RECORD)).toMatch(/50 files/);
  });
});

describe("checkDeleteFile", () => {
  it("lets the uploader and an administrator remove it, and no one else", () => {
    expect(checkDeleteFile({ uploadedBy: "a", actorId: "a", canAdminister: false })).toBeNull();
    expect(checkDeleteFile({ uploadedBy: "a", actorId: "b", canAdminister: true })).toBeNull();
    expect(checkDeleteFile({ uploadedBy: "a", actorId: "b", canAdminister: false })).toMatch(
      /administrator/,
    );
    expect(checkDeleteFile({ uploadedBy: null, actorId: null, canAdminister: false })).toMatch(
      /administrator/,
    );
  });
});

describe("filePermission", () => {
  it("follows the record the file is on", () => {
    expect(filePermission({ dealId: "x" }, "view")).toBe("deals:view");
    expect(filePermission({ leadId: "x" }, "update")).toBe("leads:update");
    expect(filePermission({ organizationId: "x" }, "view")).toBe("organizations:view");
    expect(filePermission({ contactId: "x" }, "update")).toBe("contacts:update");
  });
});
