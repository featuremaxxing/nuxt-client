import { type AssignmentSubmissionFileResponse } from "@api-server";

// Feedback files on a submission node are identified by name prefixes (the file
// storage does not expose mime types on the list endpoint): `feedback-audio-` for
// voice feedback, `feedback-pdf-` for annotated PDF corrections and `feedback-img-`
// for annotated image corrections.
export const FEEDBACK_PREFIX = "feedback-";
export const FEEDBACK_AUDIO_PREFIX = "feedback-audio-";

export const isFeedbackName = (name: string) => name.startsWith(FEEDBACK_PREFIX);

export const isFeedbackAudioName = (name: string) => name.startsWith(FEEDBACK_AUDIO_PREFIX);

export type FeedbackFileKind = "pdf" | "img";

export const feedbackKind = (name: string): FeedbackFileKind | undefined => {
	if (name.includes("feedback-pdf-")) return "pdf";
	if (name.includes("feedback-img-")) return "img";

	return undefined;
};

// Feedback files are named "feedback-<kind>-<timestamp>.<ext>" (see uploadRecording/
// onAnnotatorSave in AssignmentSubmissionsOverlay.vue). Extracting that timestamp lets the
// UI show "Korrektur (17.09.2026, 16:53)" instead of the raw, meaningless file name.
export const feedbackFileTimestamp = (name: string): number | undefined => {
	const match = name.match(/^feedback-(?:pdf|img|audio)-(\d+)\./);
	if (!match) return undefined;

	const timestamp = Number(match[1]);
	return Number.isFinite(timestamp) ? timestamp : undefined;
};

// The server returns feedback files newest first. When re-annotating a correction a
// new version is created, so only the newest correction per kind is relevant.
export const latestFeedbackFileNames = (
	feedbackFiles: AssignmentSubmissionFileResponse[] | null | undefined
): Set<string> => {
	const seenKinds = new Set<FeedbackFileKind>();
	const latest = new Set<string>();

	for (const file of feedbackFiles ?? []) {
		const kind = feedbackKind(file.name);
		if (!kind || seenKinds.has(kind)) continue;

		latest.add(file.name);
		seenKinds.add(kind);
	}

	return latest;
};
