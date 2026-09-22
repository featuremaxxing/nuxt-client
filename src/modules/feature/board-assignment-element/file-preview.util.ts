import { FileRecord } from "@/types/file/File";
import {
	isAudioMimeType,
	isImageMimeType,
	isPdfMimeType,
	isPreviewPossible,
	isScanStatusBlocked,
	isTextMimeType,
	isVideoMimeType,
} from "@/utils/fileHelper";

export enum AssignmentPreviewKind {
	IMAGE = "image",
	PDF = "pdf",
	TEXT = "text",
	AUDIO = "audio",
	VIDEO = "video",
	NONE = "none",
}

// Single place deciding what "view this file" means for a submission/feedback file -
// shared by the student's own submission, the teacher's grading overlay and the
// feedback correction list, so the three no longer drift out of sync with each other.
export const previewKindFor = (record: FileRecord | undefined): AssignmentPreviewKind => {
	if (!record) return AssignmentPreviewKind.NONE;

	// a virus-blocked file is never shown, regardless of its mime type
	if (isScanStatusBlocked(record.securityCheckStatus)) return AssignmentPreviewKind.NONE;

	if (isPdfMimeType(record.mimeType)) return AssignmentPreviewKind.PDF;

	// same condition the file element uses for its own thumbnail - still covers a
	// virus scan still in progress, which has no preview yet either
	if (isImageMimeType(record.mimeType) && isPreviewPossible(record.previewStatus)) {
		return AssignmentPreviewKind.IMAGE;
	}

	if (isTextMimeType(record.mimeType)) return AssignmentPreviewKind.TEXT;
	if (isAudioMimeType(record.mimeType)) return AssignmentPreviewKind.AUDIO;
	if (isVideoMimeType(record.mimeType)) return AssignmentPreviewKind.VIDEO;

	// Office documents (docx/xlsx/...) end up here and fall back to download. The
	// preview for those is fully built already, just not wired to anything live:
	// `file-storage` ships a complete WOPI module (src/modules/wopi/, exposing
	// GET /wopi/authorized-collabora-document-url?fileRecordId=…&editorMode=view),
	// and the client already has CollaboraEditor.vue, the "collabora" route and the
	// FEATURE_COLUMN_BOARD_COLLABORA_ENABLED flag (see FileContentElement.vue:247-261).
	// It isn't connected here because Collabora isn't available in the local teststack
	// ("Nicht vorhanden, daher nicht testbar", AGENTS.md) and so could not be tested.
	// Once it is: return a COLLABORA kind when record.isCollaboraEditable && the flag
	// is on, and open it read-only via
	// router.resolve({ name: "collabora", params: { id: record.id }, query: { edit: "false" } }).
	return AssignmentPreviewKind.NONE;
};

export const canPreview = (record: FileRecord | undefined): boolean =>
	previewKindFor(record) !== AssignmentPreviewKind.NONE;
