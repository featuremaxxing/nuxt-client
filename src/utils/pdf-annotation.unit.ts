import { drawStrokesOnCanvas, flattenStrokesIntoPdf, type Stroke, StrokeModel } from "./pdf-annotation";

describe("pdf-annotation", () => {
	const buildStroke = (overrides: Partial<Stroke> = {}): Stroke => ({
		pageIndex: 0,
		color: "#ff0000",
		widthFactor: 0.002,
		points: [
			{ x: 0.1, y: 0.1 },
			{ x: 0.5, y: 0.5 },
			{ x: 0.9, y: 0.2 },
		],
		...overrides,
	});

	describe("StrokeModel", () => {
		it("should add strokes and expose them per page", () => {
			const model = new StrokeModel();
			model.addStroke(buildStroke());
			model.addStroke(buildStroke({ pageIndex: 2 }));

			expect(model.getAll()).toHaveLength(2);
			expect(model.strokesForPage(0)).toHaveLength(1);
			expect(model.strokesForPage(2)).toHaveLength(1);
			expect(model.strokesForPage(1)).toHaveLength(0);
			expect(model.isEmpty()).toBe(false);
		});

		it("should ignore empty strokes", () => {
			const model = new StrokeModel();
			model.addStroke(buildStroke({ points: [] }));

			expect(model.isEmpty()).toBe(true);
		});

		it("should undo the most recent stroke across pages", () => {
			const model = new StrokeModel();
			model.addStroke(buildStroke({ pageIndex: 0 }));
			model.addStroke(buildStroke({ pageIndex: 1 }));

			model.undo();

			expect(model.getAll()).toHaveLength(1);
			expect(model.strokesForPage(0)).toHaveLength(1);
			expect(model.strokesForPage(1)).toHaveLength(0);
		});

		it("should clear only the strokes of the given page", () => {
			const model = new StrokeModel();
			model.addStroke(buildStroke({ pageIndex: 0 }));
			model.addStroke(buildStroke({ pageIndex: 1 }));

			model.clearPage(0);

			expect(model.strokesForPage(0)).toHaveLength(0);
			expect(model.strokesForPage(1)).toHaveLength(1);
		});

		it("should erase strokes touched by the eraser point", () => {
			const model = new StrokeModel();
			model.addStroke(buildStroke());
			model.addStroke(buildStroke({ points: [{ x: 0.9, y: 0.9 }] }));

			const erased = model.eraseAt(0, { x: 0.5, y: 0.5 }, 0.01);

			expect(erased).toBe(true);
			expect(model.getAll()).toHaveLength(1);
		});

		it("should not erase strokes on other pages or far away points", () => {
			const model = new StrokeModel();
			model.addStroke(buildStroke({ pageIndex: 1 }));

			expect(model.eraseAt(0, { x: 0.5, y: 0.5 }, 0.01)).toBe(false);
			expect(model.eraseAt(1, { x: 0.0, y: 0.0 }, 0.01)).toBe(false);
			expect(model.getAll()).toHaveLength(1);
		});
	});

	describe("drawStrokesOnCanvas", () => {
		it("should draw a polyline for every stroke", () => {
			const calls: string[] = [];
			const ctx = {
				beginPath: () => calls.push("begin"),
				moveTo: () => calls.push("move"),
				lineTo: () => calls.push("line"),
				stroke: () => calls.push("stroke"),
				clearRect: () => calls.push("clear"),
				strokeStyle: "",
				lineWidth: 0,
				lineCap: "",
				lineJoin: "",
			};

			drawStrokesOnCanvas(ctx, [buildStroke()], 1000, 500);

			expect(calls[0]).toBe("clear");
			expect(calls.filter((call) => call === "move")).toHaveLength(1);
			expect(calls.filter((call) => call === "line")).toHaveLength(2);
			expect(calls.filter((call) => call === "stroke")).toHaveLength(1);
			expect(ctx.lineWidth).toBeCloseTo(2);
		});
	});

	describe("flattenStrokesIntoPdf", () => {
		it("should return a loadable PDF containing the strokes", async () => {
			const { PDFDocument } = await import("pdf-lib");
			const source = await PDFDocument.create();
			source.addPage([400, 600]);
			const bytes = await source.save();

			const blob = await flattenStrokesIntoPdf(bytes, [buildStroke()]);

			expect(blob.type).toBe("application/pdf");

			const doc = await PDFDocument.load(await blob.arrayBuffer());
			expect(doc.getPageCount()).toBe(1);
		});

		it("should skip strokes pointing to non-existent pages", async () => {
			const { PDFDocument } = await import("pdf-lib");
			const source = await PDFDocument.create();
			source.addPage([400, 600]);
			const bytes = await source.save();

			const blob = await flattenStrokesIntoPdf(bytes, [buildStroke({ pageIndex: 5 })]);

			const doc = await PDFDocument.load(await blob.arrayBuffer());
			expect(doc.getPageCount()).toBe(1);
		});
	});
});
