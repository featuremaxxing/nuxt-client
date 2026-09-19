import {
	CommentModel,
	drawStrokesOnCanvas,
	flattenStrokesIntoPdf,
	type PdfComment,
	readPdfComments,
	type Stroke,
	StrokeModel,
} from "./pdf-annotation";

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

	const buildComment = (overrides: Partial<PdfComment> = {}): PdfComment => ({
		id: "comment-1",
		pageIndex: 0,
		x: 0.2,
		y: 0.3,
		text: "please fix this",
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

	describe("CommentModel", () => {
		it("should add comments and expose them per page", () => {
			const model = new CommentModel();
			model.add(buildComment({ id: "a", pageIndex: 0 }));
			model.add(buildComment({ id: "b", pageIndex: 2 }));

			expect(model.getAll()).toHaveLength(2);
			expect(model.commentsForPage(0)).toHaveLength(1);
			expect(model.commentsForPage(2)).toHaveLength(1);
			expect(model.commentsForPage(1)).toHaveLength(0);
			expect(model.isEmpty()).toBe(false);
		});

		it("should update a comment's text in place", () => {
			const model = new CommentModel();
			model.add(buildComment({ id: "a", text: "old" }));

			model.update("a", "new");

			expect(model.getAll()[0].text).toBe("new");
		});

		it("should ignore an update for an unknown id", () => {
			const model = new CommentModel();
			model.add(buildComment({ id: "a", text: "old" }));

			model.update("missing", "new");

			expect(model.getAll()[0].text).toBe("old");
		});

		it("should remove a comment by id", () => {
			const model = new CommentModel();
			model.add(buildComment({ id: "a" }));
			model.add(buildComment({ id: "b" }));

			model.remove("a");

			expect(model.getAll().map((comment) => comment.id)).toEqual(["b"]);
		});

		it("should replace the whole set, e.g. when seeding from an opened PDF", () => {
			const model = new CommentModel();
			model.add(buildComment({ id: "stale" }));

			model.replaceAll([buildComment({ id: "fresh" })]);

			expect(model.getAll().map((comment) => comment.id)).toEqual(["fresh"]);
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

		// reads back the Text-subtype annotations of one page as plain {subtype, contents}
		// objects, the way a PDF viewer (or our own readPdfComments) would see them
		const textAnnotationsOf = async (bytes: ArrayBuffer, pageIndex: number) => {
			const { PDFDocument, PDFDict, PDFName, PDFString } = await import("pdf-lib");
			const doc = await PDFDocument.load(bytes);
			const page = doc.getPages()[pageIndex];
			const annots = page.node.Annots()?.asArray() ?? [];

			return annots
				.map((ref) => doc.context.lookupMaybe(ref, PDFDict))
				.filter((dict) => dict !== undefined)
				.map((dict) => {
					const contents = dict.get(PDFName.of("Contents"));

					return {
						subtype: dict.get(PDFName.of("Subtype"))?.toString(),
						contents: contents instanceof PDFString ? contents.decodeText() : undefined,
					};
				});
		};

		it("should write comments as real Text annotations on the right page", async () => {
			const { PDFDocument } = await import("pdf-lib");
			const source = await PDFDocument.create();
			source.addPage([400, 600]);
			source.addPage([400, 600]);
			const bytes = await source.save();

			const blob = await flattenStrokesIntoPdf(
				bytes,
				[],
				[buildComment({ id: "a", pageIndex: 1, text: "second page note" })]
			);
			const result = await blob.arrayBuffer();

			expect(await textAnnotationsOf(result, 0)).toEqual([]);
			expect(await textAnnotationsOf(result, 1)).toEqual([{ subtype: "/Text", contents: "second page note" }]);
		});

		it("should carry over an unchanged comment when re-saving after opening a correction again", async () => {
			const { PDFDocument } = await import("pdf-lib");
			const source = await PDFDocument.create();
			source.addPage([400, 600]);
			const firstRoundBytes = await (
				await flattenStrokesIntoPdf(await source.save(), [], [buildComment({ id: "a", text: "please fix" })])
			).arrayBuffer();

			// re-save without any edits, simulating "continue correcting" with an
			// untouched model seeded straight from readPdfComments
			const reopened = await readPdfComments(
				await (
					await import("pdfjs-dist")
				).getDocument({
					data: firstRoundBytes.slice(0),
				}).promise
			);
			const secondRoundBytes = await (await flattenStrokesIntoPdf(firstRoundBytes, [], reopened)).arrayBuffer();

			const annotations = await textAnnotationsOf(secondRoundBytes, 0);
			expect(annotations).toEqual([{ subtype: "/Text", contents: "please fix" }]);
		});

		it("should replace an edited comment and drop a removed one instead of duplicating", async () => {
			const { PDFDocument } = await import("pdf-lib");
			const source = await PDFDocument.create();
			source.addPage([400, 600]);
			const firstRoundBytes = await (
				await flattenStrokesIntoPdf(
					await source.save(),
					[],
					[buildComment({ id: "keep", text: "old text" }), buildComment({ id: "drop", text: "to be deleted" })]
				)
			).arrayBuffer();

			// second round: "keep" is edited, "drop" is gone, one brand-new comment is added
			const secondRoundBytes = await (
				await flattenStrokesIntoPdf(
					firstRoundBytes,
					[],
					[buildComment({ id: "keep", text: "new text" }), buildComment({ id: "new", text: "added later" })]
				)
			).arrayBuffer();

			const annotations = await textAnnotationsOf(secondRoundBytes, 0);
			expect(annotations).toHaveLength(2);
			expect(annotations.map((annotation) => annotation.contents).sort()).toEqual(["added later", "new text"]);
		});

		it("should leave non-comment annotations (e.g. links) untouched while dropping a comment no longer in the model", async () => {
			const { PDFDocument, PDFString } = await import("pdf-lib");
			const source = await PDFDocument.create();
			const page = source.addPage([400, 600]);
			const linkRef = source.context.register(
				source.context.obj({ Type: "Annot", Subtype: "Link", Rect: [0, 0, 10, 10] })
			);
			page.node.addAnnot(linkRef);
			const commentRef = source.context.register(
				source.context.obj({ Type: "Annot", Subtype: "Text", Contents: PDFString.of("existing"), Rect: [0, 0, 1, 1] })
			);
			page.node.addAnnot(commentRef);
			const bytes = await source.save();

			// an empty comment model - as if the teacher deleted the one pre-existing comment
			const result = await (await flattenStrokesIntoPdf(bytes, [], [])).arrayBuffer();

			const { PDFDocument: PDFDocumentReload, PDFDict, PDFName } = await import("pdf-lib");
			const doc = await PDFDocumentReload.load(result);
			const annots = doc.getPages()[0].node.Annots()?.asArray() ?? [];
			const subtypes = annots
				.map((ref) => doc.context.lookupMaybe(ref, PDFDict))
				.filter((dict) => dict !== undefined)
				.map((dict) => dict.get(PDFName.of("Subtype"))?.toString());

			// only the link remains
			expect(subtypes).toEqual(["/Link"]);
		});
	});

	describe("readPdfComments", () => {
		it("should read an existing Text annotation into a normalized comment", async () => {
			const { PDFDocument, PDFString } = await import("pdf-lib");
			const source = await PDFDocument.create();
			const page = source.addPage([400, 600]);
			// a 40x40pt marker with its top-left corner at (40, 60) from the page's top
			const ref = source.context.register(
				source.context.obj({
					Type: "Annot",
					Subtype: "Text",
					Contents: PDFString.of("hello from the pdf"),
					Rect: [40, 500, 80, 540],
				})
			);
			page.node.addAnnot(ref);
			const bytes = await source.save();

			const { getDocument } = await import("pdfjs-dist");
			const pdfDoc = await getDocument({ data: bytes.slice(0) }).promise;
			const comments = await readPdfComments(pdfDoc);

			expect(comments).toHaveLength(1);
			expect(comments[0].text).toBe("hello from the pdf");
			expect(comments[0].pageIndex).toBe(0);
			expect(comments[0].x).toBeCloseTo(40 / 400);
			expect(comments[0].y).toBeCloseTo(60 / 600);
		});

		it("should return an empty list for a PDF without comments", async () => {
			const { PDFDocument } = await import("pdf-lib");
			const source = await PDFDocument.create();
			source.addPage([400, 600]);
			const bytes = await source.save();

			const { getDocument } = await import("pdfjs-dist");
			const pdfDoc = await getDocument({ data: bytes.slice(0) }).promise;

			expect(await readPdfComments(pdfDoc)).toEqual([]);
		});
	});
});
