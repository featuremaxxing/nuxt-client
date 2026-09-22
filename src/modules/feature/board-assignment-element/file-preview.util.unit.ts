import { AssignmentPreviewKind, canPreview, previewKindFor } from "./file-preview.util";
import { FilePreviewStatus, FileRecordVirusScanStatus } from "@/types/file/File";
import { fileRecordFactory } from "@@/tests/test-utils";

describe("file-preview.util", () => {
	describe("previewKindFor", () => {
		it("returns NONE when no record is given", () => {
			expect(previewKindFor(undefined)).toBe(AssignmentPreviewKind.NONE);
		});

		it("returns NONE when the file is virus-blocked, regardless of mime type", () => {
			const record = fileRecordFactory.build({
				mimeType: "application/pdf",
				securityCheckStatus: FileRecordVirusScanStatus.BLOCKED,
			});

			expect(previewKindFor(record)).toBe(AssignmentPreviewKind.NONE);
		});

		it("returns PDF for a pdf file, independent of preview status", () => {
			const record = fileRecordFactory.build({
				mimeType: "application/pdf",
				previewStatus: FilePreviewStatus.PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE,
			});

			expect(previewKindFor(record)).toBe(AssignmentPreviewKind.PDF);
		});

		it("returns IMAGE for an image with a possible preview", () => {
			const record = fileRecordFactory.build({
				mimeType: "image/png",
				previewStatus: FilePreviewStatus.PREVIEW_POSSIBLE,
			});

			expect(previewKindFor(record)).toBe(AssignmentPreviewKind.IMAGE);
		});

		it("returns NONE for an image without a possible preview yet", () => {
			const record = fileRecordFactory.build({
				mimeType: "image/png",
				previewStatus: FilePreviewStatus.AWAITING_SCAN_STATUS,
			});

			expect(previewKindFor(record)).toBe(AssignmentPreviewKind.NONE);
		});

		it("returns TEXT for a text file", () => {
			const record = fileRecordFactory.build({ mimeType: "text/plain" });

			expect(previewKindFor(record)).toBe(AssignmentPreviewKind.TEXT);
		});

		it("returns AUDIO for an audio file", () => {
			const record = fileRecordFactory.build({ mimeType: "audio/mpeg" });

			expect(previewKindFor(record)).toBe(AssignmentPreviewKind.AUDIO);
		});

		it("returns VIDEO for a video file", () => {
			const record = fileRecordFactory.build({ mimeType: "video/mp4" });

			expect(previewKindFor(record)).toBe(AssignmentPreviewKind.VIDEO);
		});

		it("returns NONE for an office document (no Collabora wiring yet)", () => {
			const record = fileRecordFactory.build({
				mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			});

			expect(previewKindFor(record)).toBe(AssignmentPreviewKind.NONE);
		});
	});

	describe("canPreview", () => {
		it("returns false when no record is given", () => {
			expect(canPreview(undefined)).toBe(false);
		});

		it("returns true for a previewable kind", () => {
			const record = fileRecordFactory.build({ mimeType: "application/pdf" });

			expect(canPreview(record)).toBe(true);
		});

		it("returns false for a non-previewable kind", () => {
			const record = fileRecordFactory.build({ mimeType: "application/zip" });

			expect(canPreview(record)).toBe(false);
		});
	});
});
