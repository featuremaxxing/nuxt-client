import {
	feedbackFileTimestamp,
	feedbackKind,
	isFeedbackAudioName,
	isFeedbackName,
	latestFeedbackFileNames,
} from "./feedback-files.util";

describe("feedback-files.util", () => {
	describe("isFeedbackName", () => {
		it("should recognize feedback file names", () => {
			expect(isFeedbackName("feedback-pdf-1.pdf")).toBe(true);
			expect(isFeedbackName("essay.pdf")).toBe(false);
		});
	});

	describe("isFeedbackAudioName", () => {
		it("should recognize feedback audio file names", () => {
			expect(isFeedbackAudioName("feedback-audio-1.webm")).toBe(true);
			expect(isFeedbackAudioName("feedback-pdf-1.pdf")).toBe(false);
		});
	});

	describe("feedbackKind", () => {
		it("should detect the pdf kind", () => {
			expect(feedbackKind("feedback-pdf-1.pdf")).toBe("pdf");
		});

		it("should detect the img kind", () => {
			expect(feedbackKind("feedback-img-1.png")).toBe("img");
		});

		it("should return undefined for names without a known kind", () => {
			expect(feedbackKind("feedback-audio-1.webm")).toBeUndefined();
			expect(feedbackKind("essay.pdf")).toBeUndefined();
		});
	});

	describe("feedbackFileTimestamp", () => {
		it("should extract the timestamp from a pdf feedback file name", () => {
			expect(feedbackFileTimestamp("feedback-pdf-1789657354910.pdf")).toBe(1789657354910);
		});

		it("should extract the timestamp from an image feedback file name", () => {
			expect(feedbackFileTimestamp("feedback-img-1700000000000.png")).toBe(1700000000000);
		});

		it("should extract the timestamp from an audio feedback file name", () => {
			expect(feedbackFileTimestamp("feedback-audio-1700000000000.webm")).toBe(1700000000000);
		});

		it("should return undefined when the name has no recognizable timestamp", () => {
			expect(feedbackFileTimestamp("essay.pdf")).toBeUndefined();
			expect(feedbackFileTimestamp("feedback-pdf-not-a-number.pdf")).toBeUndefined();
		});
	});

	describe("latestFeedbackFileNames", () => {
		it("should return an empty set when there are no feedback files", () => {
			expect(latestFeedbackFileNames(undefined)).toEqual(new Set());
			expect(latestFeedbackFileNames(null)).toEqual(new Set());
			expect(latestFeedbackFileNames([])).toEqual(new Set());
		});

		it("should keep only the newest file per kind, given newest-first order", () => {
			const result = latestFeedbackFileNames([
				{ fileRecordId: "2", name: "feedback-pdf-2.pdf" },
				{ fileRecordId: "1", name: "feedback-pdf-1.pdf" },
				{ fileRecordId: "img-1", name: "feedback-img-1.png" },
			]);

			expect(result).toEqual(new Set(["feedback-pdf-2.pdf", "feedback-img-1.png"]));
		});
	});
});
