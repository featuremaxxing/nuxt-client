import { formatVoterName } from "./poll-voter.util";
import { PollAnswerMode, PollElementContent, PollQuestionResultResponse, PollVoterResponse } from "@api-server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// This module builds plain-text/PDF exports outside of Vue/i18n context, so the fallback name for
// a voter without firstName/lastName is a plain German string (matching the rest of this file's
// hardcoded German column headers, e.g. "Frage"/"Option"/"Anzahl") rather than a translated label.
const UNKNOWN_VOTER_LABEL = "Unbekannte Person";

export interface PollResultsForExport {
	participantCount: number;
	perQuestion: PollQuestionResultResponse[];
}

const CSV_DELIMITER = ";"; // German Excel's default list separator, so opening the export there
// doesn't require a manual "text to columns" step (a plain comma is read as one column).

const escapeCsvField = (field: string): string => {
	if (field.includes(CSV_DELIMITER) || field.includes('"') || field.includes("\n")) {
		return `"${field.replace(/"/g, '""')}"`;
	}
	return field;
};

const formatPercent = (count: number, total: number): string => {
	if (total <= 0) return "0%";
	return `${Math.round((count / total) * 1000) / 10}%`;
};

/**
 * Builds the CSV export content (as plain text, no BOM). Columns: question, option, count,
 * percentage. For non-anonymous polls with voter data available, appends a second block with the
 * individual answers (name, question, answer) - see the plan's "Einzelantworten" export section.
 *
 * The caller is responsible for the UTF-8 BOM + Blob wrapping (see PollStatusBar.vue), since
 * eslint --fix has been known to mangle a literal BOM escape sequence in source, and that's
 * easier to spot-check in one small place than inside this pure builder.
 */
export const buildPollResultsCsv = (
	poll: PollElementContent,
	results: PollResultsForExport,
	voters?: PollVoterResponse[]
): string => {
	const rows: string[][] = [["Frage", "Option", "Anzahl", "Prozent"]];

	poll.questions.forEach((question) => {
		const snapshot = results.perQuestion.find((entry) => entry.questionId === question.id);

		if (question.answerMode === PollAnswerMode.TEXT) {
			const answers = snapshot?.textAnswers ?? [];
			const total = answers.length;
			const countsByAnswer = new Map<string, number>();
			answers.forEach((answer) => countsByAnswer.set(answer, (countsByAnswer.get(answer) ?? 0) + 1));

			if (countsByAnswer.size === 0) {
				rows.push([question.text, "", "0", "0%"]);
			} else {
				countsByAnswer.forEach((count, answer) => {
					rows.push([question.text, answer, String(count), formatPercent(count, total)]);
				});
			}
			return;
		}

		const counts = snapshot?.counts ?? [];
		const total = counts.reduce((sum, entry) => sum + entry.count, 0);
		question.options.forEach((option) => {
			const count = counts.find((entry) => entry.optionId === option.id)?.count ?? 0;
			rows.push([question.text, option.text, String(count), formatPercent(count, total)]);
		});
	});

	if (!poll.isAnonymous && voters && voters.length > 0) {
		rows.push([]);
		rows.push(["Einzelantworten"]);
		rows.push(["Name", "Frage", "Antwort"]);

		voters.forEach((voter) => {
			const name = formatVoterName(voter, UNKNOWN_VOTER_LABEL);
			voter.answers.forEach((answer) => {
				const question = poll.questions.find((entry) => entry.id === answer.questionId);
				if (!question) return;

				const answerText =
					answer.textAnswer ??
					answer.selectedOptionIds
						.map((optionId) => question.options.find((option) => option.id === optionId)?.text ?? optionId)
						.join(", ");

				rows.push([name, question.text, answerText]);
			});
		});
	}

	return rows.map((row) => row.map(escapeCsvField).join(CSV_DELIMITER)).join("\n");
};

const WIN_ANSI_MAX_CODE_POINT = 0xff;

// pdf-lib's built-in StandardFonts are WinAnsi-encoded and throw on anything outside that range
// (emoji, most non-Latin scripts, ...). Strip such characters rather than let drawText() throw
// and abort the whole export.
const sanitizeForWinAnsi = (text: string): string =>
	Array.from(text)
		.filter((char) => (char.codePointAt(0) ?? 0) <= WIN_ANSI_MAX_CODE_POINT)
		.join("");

const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;

/**
 * Builds the PDF export: title, generation date, participant count, then per question either the
 * rasterized chart (chartPngBlobs, keyed by questionId - only for single/multiple questions) plus
 * the numeric breakdown as text, or the plain answer list for text questions.
 */
export const buildPollResultsPdf = async (
	poll: PollElementContent,
	results: PollResultsForExport,
	chartPngBlobs: Record<string, Blob> = {}
): Promise<Blob> => {
	const pdfDoc = await PDFDocument.create();
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	let cursorY = PAGE_HEIGHT - MARGIN;

	const ensureSpace = (needed: number) => {
		if (cursorY - needed < MARGIN) {
			page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
			cursorY = PAGE_HEIGHT - MARGIN;
		}
	};

	const drawText = (text: string, options: { size?: number; bold?: boolean } = {}) => {
		const size = options.size ?? 11;
		ensureSpace(size + 6);
		page.drawText(sanitizeForWinAnsi(text), {
			x: MARGIN,
			y: cursorY,
			size,
			font: options.bold ? boldFont : font,
			color: rgb(0.1, 0.1, 0.1),
		});
		cursorY -= size + 6;
	};

	drawText(poll.title || "Umfrage", { size: 18, bold: true });
	drawText(`Erstellt am ${new Date().toLocaleString("de-DE")}`, { size: 10 });
	drawText(`Teilnehmende: ${results.participantCount}`, { size: 10 });
	cursorY -= 10;

	for (const question of poll.questions) {
		ensureSpace(30);
		drawText(question.text, { size: 13, bold: true });

		const snapshot = results.perQuestion.find((entry) => entry.questionId === question.id);

		if (question.answerMode === PollAnswerMode.TEXT) {
			const answers = snapshot?.textAnswers ?? [];
			if (answers.length === 0) {
				drawText("Keine Antworten", { size: 10 });
			} else {
				answers.forEach((answer) => drawText(`- ${answer}`, { size: 10 }));
			}
		} else {
			const pngBlob = chartPngBlobs[question.id];
			if (pngBlob) {
				const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
				const pngImage = await pdfDoc.embedPng(pngBytes);
				const maxWidth = PAGE_WIDTH - MARGIN * 2;
				const scale = Math.min(1, maxWidth / pngImage.width);
				const drawWidth = pngImage.width * scale;
				const drawHeight = pngImage.height * scale;

				ensureSpace(drawHeight + 10);
				page.drawImage(pngImage, {
					x: MARGIN,
					y: cursorY - drawHeight,
					width: drawWidth,
					height: drawHeight,
				});
				cursorY -= drawHeight + 10;
			}

			const counts = snapshot?.counts ?? [];
			const total = counts.reduce((sum, entry) => sum + entry.count, 0);
			question.options.forEach((option) => {
				const count = counts.find((entry) => entry.optionId === option.id)?.count ?? 0;
				const percent = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
				drawText(`${option.text}: ${count} (${percent}%)`, { size: 10 });
			});
		}

		cursorY -= 14;
	}

	const pdfBytes = await pdfDoc.save();
	// pdf-lib's Uint8Array return type is generic over ArrayBufferLike (which also covers
	// SharedArrayBuffer), which is narrower than lib.dom's BlobPart in newer TS versions - the
	// bytes are always backed by a plain ArrayBuffer here, so this is just a type-level mismatch.
	return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
};
