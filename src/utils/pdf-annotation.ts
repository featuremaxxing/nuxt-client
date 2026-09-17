// Annotation data model and export ("flattening") helpers for the assignment
// PDF/image correction feature. Strokes are stored in coordinates normalized to
// the rendered page (0..1), so they survive canvas resizes and can be mapped onto
// the original PDF page at export time.

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

// Bakes the strokes into a copy of the PDF as vector lines and returns it as a Blob.
export const flattenStrokesIntoPdf = async (pdfBytes: ArrayBuffer | Uint8Array, strokes: Stroke[]): Promise<Blob> => {
	const { PDFDocument, rgb, LineCapStyle } = await import("pdf-lib");

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
