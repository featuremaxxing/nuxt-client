// Annotation data model and export ("flattening") helpers for the assignment
// PDF/image correction feature. Strokes and comments are stored in coordinates
// normalized to the rendered page (0..1), so they survive canvas resizes and can
// be mapped onto the original PDF page at export time.

import type { PDFRef as PDFRefType } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";

export interface StrokePoint {
	x: number;
	y: number;
}

export interface Stroke {
	pageIndex: number;
	color: string;
	// stroke width as a fraction of the rendered page width
	widthFactor: number;
	points: StrokePoint[];
}

export interface MinimalContext {
	beginPath: () => void;
	moveTo: (x: number, y: number) => void;
	lineTo: (x: number, y: number) => void;
	stroke: () => void;
	clearRect: (x: number, y: number, w: number, h: number) => void;
	strokeStyle: unknown;
	lineWidth: number;
	lineCap: string;
	lineJoin: string;
}

export class StrokeModel {
	private strokes: Stroke[] = [];

	getAll(): Stroke[] {
		return this.strokes;
	}

	isEmpty(): boolean {
		return this.strokes.length === 0;
	}

	addStroke(stroke: Stroke): void {
		if (stroke.points.length > 0) {
			this.strokes.push(stroke);
		}
	}

	undo(): void {
		this.strokes.pop();
	}

	clearPage(pageIndex: number): void {
		this.strokes = this.strokes.filter((stroke) => stroke.pageIndex !== pageIndex);
	}

	strokesForPage(pageIndex: number): Stroke[] {
		return this.strokes.filter((stroke) => stroke.pageIndex === pageIndex);
	}

	// Removes every stroke that comes near the given point (within radiusFactor,
	// measured relative to the page width). Returns true when something was removed.
	eraseAt(pageIndex: number, point: StrokePoint, radiusFactor: number): boolean {
		const before = this.strokes.length;
		this.strokes = this.strokes.filter(
			(stroke) =>
				stroke.pageIndex !== pageIndex || !stroke.points.some((candidate) => distance(point, candidate) <= radiusFactor)
		);

		return this.strokes.length < before;
	}
}

// A text comment pinned to a page, PDF-only (image submissions have no annotation
// layer to anchor it to). Coordinates are normalized the same way as strokes.
export interface PdfComment {
	id: string;
	pageIndex: number;
	x: number;
	y: number;
	text: string;
}

export class CommentModel {
	private comments: PdfComment[] = [];

	getAll(): PdfComment[] {
		return this.comments;
	}

	isEmpty(): boolean {
		return this.comments.length === 0;
	}

	commentsForPage(pageIndex: number): PdfComment[] {
		return this.comments.filter((comment) => comment.pageIndex === pageIndex);
	}

	add(comment: PdfComment): void {
		this.comments.push(comment);
	}

	update(id: string, text: string): void {
		const comment = this.comments.find((candidate) => candidate.id === id);
		if (comment) {
			comment.text = text;
		}
	}

	remove(id: string): void {
		this.comments = this.comments.filter((comment) => comment.id !== id);
	}

	// seeds the model from comments already present in the loaded PDF (see
	// readPdfComments) - used once, right after opening a file for (re-)editing
	replaceAll(comments: PdfComment[]): void {
		this.comments = comments;
	}
}

// Points are normalized per axis; to compare distances fairly on non-square pages,
// x distances are scaled by the aspect ratio (width/height) before measuring.
export const distance = (a: StrokePoint, b: StrokePoint, aspectRatio = 1): number => {
	const dx = (a.x - b.x) * aspectRatio;
	const dy = a.y - b.y;

	return Math.sqrt(dx * dx + dy * dy);
};

export const drawStrokesOnCanvas = (
	ctx: MinimalContext,
	strokes: Stroke[],
	canvasWidth: number,
	canvasHeight: number
): void => {
	ctx.clearRect(0, 0, canvasWidth, canvasHeight);
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	for (const stroke of strokes) {
		ctx.strokeStyle = stroke.color;
		ctx.lineWidth = Math.max(1, stroke.widthFactor * canvasWidth);
		ctx.beginPath();
		ctx.moveTo(stroke.points[0].x * canvasWidth, stroke.points[0].y * canvasHeight);
		for (const point of stroke.points.slice(1)) {
			ctx.lineTo(point.x * canvasWidth, point.y * canvasHeight);
		}
		ctx.stroke();
	}
};

// A text comment is drawn as a small square marker, sized in PDF points -
// matches the marker size teacher/student see rendered in the HTML overlay.
const COMMENT_MARKER_SIZE_PT = 24;

// Reads the Text-subtype annotations already present in the PDF (comments left in
// an earlier correction round) so they can be shown, edited and re-saved instead
// of being silently dropped. Assumes an unrotated page, same as flattenStrokesIntoPdf.
export const readPdfComments = async (pdfDoc: PDFDocumentProxy): Promise<PdfComment[]> => {
	const comments: PdfComment[] = [];

	for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
		const page = await pdfDoc.getPage(pageNumber);
		const viewport = page.getViewport({ scale: 1 });
		const annotations = (await page.getAnnotations()) as Array<{
			id?: string;
			subtype?: string;
			rect?: [number, number, number, number];
			contentsObj?: { str?: string };
			contents?: string;
		}>;

		annotations.forEach((annotation, index) => {
			if (annotation.subtype !== "Text" || !annotation.rect) return;

			// rect is [x1, y1, x2, y2] in PDF user space (y-up); (x1, y2) is the
			// marker's top-left corner, which convertToViewportPoint maps to the
			// top-left of our normalized (y-down) coordinates.
			const [left, top] = viewport.convertToViewportPoint(annotation.rect[0], annotation.rect[3]);

			comments.push({
				id: annotation.id ?? `comment-${pageNumber}-${index}`,
				pageIndex: pageNumber - 1,
				x: left / viewport.width,
				y: top / viewport.height,
				text: annotation.contentsObj?.str ?? annotation.contents ?? "",
			});
		});
	}

	return comments;
};

// Bakes the strokes into a copy of the PDF as vector lines, and replaces the
// PDF's Text-subtype (comment) annotations with the given ones - the model is
// seeded from the very same annotations via readPdfComments, so this correctly
// carries over unmodified comments and applies edits/deletions/additions alike.
// Other annotation types (links, etc.) are left untouched.
export const flattenStrokesIntoPdf = async (
	pdfBytes: ArrayBuffer | Uint8Array,
	strokes: Stroke[],
	comments: PdfComment[] = []
): Promise<Blob> => {
	const { PDFDocument, PDFDict, PDFName, PDFRef, PDFString, rgb, LineCapStyle } = await import("pdf-lib");
	const isPDFRef = (entry: unknown): entry is PDFRefType => entry instanceof PDFRef;

	const doc = await PDFDocument.load(pdfBytes);
	const pages = doc.getPages();

	for (const stroke of strokes) {
		const page = pages[stroke.pageIndex];
		if (!page) {
			continue;
		}

		const { width, height } = page.getSize();
		const path = stroke.points
			.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * width} ${point.y * height}`)
			.join(" ");
		// drawSvgPath's origin is the given position, with y growing downwards -
		// anchoring at the page's top edge maps SVG space onto the page.
		const color = hexToRgb(stroke.color);
		page.drawSvgPath(path, {
			x: 0,
			y: height,
			borderColor: rgb(color.red, color.green, color.blue),
			borderWidth: Math.max(1, stroke.widthFactor * width),
			borderLineCap: LineCapStyle.Round,
		});
	}

	for (const page of pages) {
		const annots = page.node.Annots();
		if (!annots) continue;

		const textAnnotRefs = annots
			.asArray()
			.filter(isPDFRef)
			.filter((ref) => doc.context.lookupMaybe(ref, PDFDict)?.get(PDFName.of("Subtype"))?.toString() === "/Text");
		textAnnotRefs.forEach((ref) => page.node.removeAnnot(ref));
	}

	for (const comment of comments) {
		const page = pages[comment.pageIndex];
		if (!page) continue;

		const { width, height } = page.getSize();
		const x = comment.x * width;
		const y = (1 - comment.y) * height;
		const ref = doc.context.register(
			doc.context.obj({
				Type: "Annot",
				Subtype: "Text",
				Name: "Comment",
				Rect: [x, y - COMMENT_MARKER_SIZE_PT, x + COMMENT_MARKER_SIZE_PT, y],
				Contents: PDFString.of(comment.text),
				F: 4, // Print flag - keeps the marker out of the way of forms that hide annotations
				C: [1, 0.78, 0.2],
			})
		);
		page.node.addAnnot(ref);
	}

	const bytes = await doc.save();

	return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
};

// Bakes the strokes into the rendered image canvas (mutating it) and returns a PNG blob.
export const flattenStrokesIntoImage = async (baseCanvas: HTMLCanvasElement, strokes: Stroke[]): Promise<Blob> => {
	const ctx = baseCanvas.getContext("2d");
	if (!ctx) {
		throw new Error("canvas 2d context unavailable");
	}

	drawStrokesOnCanvas(ctx, strokes, baseCanvas.width, baseCanvas.height);

	return await new Promise<Blob>((resolve, reject) =>
		baseCanvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas export failed"))), "image/png")
	);
};

export const hexToRgb = (hex: string): { red: number; green: number; blue: number } => {
	const value = hex.replace("#", "");
	const red = parseInt(value.substring(0, 2), 16) / 255;
	const green = parseInt(value.substring(2, 4), 16) / 255;
	const blue = parseInt(value.substring(4, 6), 16) / 255;

	return { red, green, blue };
};
