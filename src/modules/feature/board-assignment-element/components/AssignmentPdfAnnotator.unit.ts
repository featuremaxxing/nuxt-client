import AssignmentPdfAnnotator, { type AnnotatorSource } from "./AssignmentPdfAnnotator.vue";
import type { PdfComment } from "@/utils/pdf-annotation";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { flushPromises, mount } from "@vue/test-utils";

const {
	loadPdfMock,
	renderPdfPageToCanvasMock,
	readPdfCommentsMock,
	flattenStrokesIntoPdfMock,
	drawStrokesOnCanvasMock,
} = vi.hoisted(() => ({
	loadPdfMock: vi.fn(),
	renderPdfPageToCanvasMock: vi.fn(),
	readPdfCommentsMock: vi.fn(),
	flattenStrokesIntoPdfMock: vi.fn(),
	drawStrokesOnCanvasMock: vi.fn(),
}));

vi.mock("@/utils/pdf-renderer", () => ({
	loadPdf: loadPdfMock,
	renderPdfPageToCanvas: renderPdfPageToCanvasMock,
	MAX_RENDER_DIMENSION: 2400,
}));

vi.mock("@/utils/pdf-annotation", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/utils/pdf-annotation")>();

	return {
		...actual,
		readPdfComments: readPdfCommentsMock,
		flattenStrokesIntoPdf: flattenStrokesIntoPdfMock,
		drawStrokesOnCanvas: drawStrokesOnCanvasMock,
	};
});

describe("AssignmentPdfAnnotator", () => {
	const pdfSource: AnnotatorSource = { kind: "pdf", url: "https://api/files/essay.pdf", name: "essay.pdf" };
	const imageSource: AnnotatorSource = { kind: "image", url: "https://api/files/essay.png", name: "essay.png" };

	let originalFetch: typeof fetch;
	let getContextSpy: ReturnType<typeof vi.spyOn>;
	let getBoundingClientRectSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		loadPdfMock.mockResolvedValue({ numPages: 1 });
		renderPdfPageToCanvasMock.mockResolvedValue({ width: 400, height: 600 });
		readPdfCommentsMock.mockResolvedValue([]);
		flattenStrokesIntoPdfMock.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));
		drawStrokesOnCanvasMock.mockImplementation(() => undefined);

		originalFetch = global.fetch;
		global.fetch = vi
			.fn()
			.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) }) as unknown as typeof fetch;

		// jsdom has no real canvas backend by default - a fake 2D context lets
		// redrawInk get past its `if (!ctx) return` guard during tests
		getContextSpy = vi
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockReturnValue({} as unknown as CanvasRenderingContext2D);

		// jsdom's getBoundingClientRect is all zeros by default, which would turn
		// every click position into NaN - give the comment layer a known size
		getBoundingClientRectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockReturnValue({ left: 0, top: 0, width: 400, height: 600, right: 400, bottom: 600 } as DOMRect);

		// jsdom does not implement the Pointer Events capture API at all
		if (!HTMLCanvasElement.prototype.setPointerCapture) {
			HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
		}
	});

	afterEach(() => {
		vi.clearAllMocks();
		global.fetch = originalFetch;
		getContextSpy.mockRestore();
		getBoundingClientRectSpy.mockRestore();
	});

	// vue-test-utils' `.trigger()` assigns properties onto a plain Event, but
	// clientX/clientY are getter-only on a real PointerEvent - dispatch one directly
	const dispatchPointer = async (target: Element, type: string, init: PointerEventInit) => {
		target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, ...init }));
		await flushPromises();
	};

	const setup = async (source: AnnotatorSource = pdfSource) => {
		const wrapper = mount(AssignmentPdfAnnotator, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: { VDialog: { template: "<div><slot /></div>" } },
			},
			props: { isOpen: true, source },
		});

		await flushPromises();

		return { wrapper };
	};

	it("only offers the comment tool for a PDF source, not an image", async () => {
		const { wrapper: pdfWrapper } = await setup(pdfSource);
		expect(pdfWrapper.find("[data-testid='annotator-comment-tool']").exists()).toBe(true);

		const { wrapper: imageWrapper } = await setup(imageSource);
		expect(imageWrapper.find("[data-testid='annotator-comment-tool']").exists()).toBe(false);
	});

	it("keeps the marker layer inert until the comment tool is selected", async () => {
		const { wrapper } = await setup();

		const layer = wrapper.find("[data-testid='annotator-comment-layer']");
		expect(layer.classes()).not.toContain("annotator-comment-layer--active");

		await wrapper.find("[data-testid='annotator-comment-tool']").trigger("click");

		expect(wrapper.find("[data-testid='annotator-comment-layer']").classes()).toContain(
			"annotator-comment-layer--active"
		);
	});

	it("places a marker where the user clicks and opens it for typing", async () => {
		const { wrapper } = await setup();
		await wrapper.find("[data-testid='annotator-comment-tool']").trigger("click");

		await wrapper.find("[data-testid='annotator-comment-layer']").trigger("click", { clientX: 100, clientY: 300 });

		const markers = wrapper.findAll("[data-testid^='annotator-comment-marker-']");
		expect(markers).toHaveLength(1);
		expect(wrapper.find("[data-testid='annotator-comment-popup']").exists()).toBe(true);
		const input = wrapper.find("[data-testid='annotator-comment-input'] textarea");
		expect((input.element as HTMLTextAreaElement).value).toBe("");
	});

	it("keeps the marker after typing text and clicking done, and reopens it with the same text", async () => {
		const { wrapper } = await setup();
		await wrapper.find("[data-testid='annotator-comment-tool']").trigger("click");
		await wrapper.find("[data-testid='annotator-comment-layer']").trigger("click", { clientX: 100, clientY: 300 });

		await wrapper.find("[data-testid='annotator-comment-input'] textarea").setValue("please redo this section");
		await wrapper.find("[data-testid='annotator-comment-done']").trigger("click");

		expect(wrapper.find("[data-testid='annotator-comment-popup']").exists()).toBe(false);
		const marker = wrapper.find("[data-testid^='annotator-comment-marker-']");
		expect(marker.exists()).toBe(true);

		await marker.trigger("click");

		const input = wrapper.find("[data-testid='annotator-comment-input'] textarea");
		expect((input.element as HTMLTextAreaElement).value).toBe("please redo this section");
	});

	it("discards a comment left empty instead of leaving a blank marker", async () => {
		const { wrapper } = await setup();
		await wrapper.find("[data-testid='annotator-comment-tool']").trigger("click");
		await wrapper.find("[data-testid='annotator-comment-layer']").trigger("click", { clientX: 100, clientY: 300 });

		await wrapper.find("[data-testid='annotator-comment-done']").trigger("click");

		expect(wrapper.findAll("[data-testid^='annotator-comment-marker-']")).toHaveLength(0);
	});

	it("removes a comment via the delete button", async () => {
		const { wrapper } = await setup();
		await wrapper.find("[data-testid='annotator-comment-tool']").trigger("click");
		await wrapper.find("[data-testid='annotator-comment-layer']").trigger("click", { clientX: 100, clientY: 300 });
		await wrapper.find("[data-testid='annotator-comment-input'] textarea").setValue("to be deleted");

		await wrapper.find("[data-testid='annotator-comment-delete']").trigger("click");

		expect(wrapper.findAll("[data-testid^='annotator-comment-marker-']")).toHaveLength(0);
		expect(wrapper.find("[data-testid='annotator-comment-popup']").exists()).toBe(false);
	});

	it("loads comments already present in the PDF and shows them as markers", async () => {
		const existing: PdfComment = { id: "existing-1", pageIndex: 0, x: 0.25, y: 0.4, text: "from a previous round" };
		readPdfCommentsMock.mockResolvedValue([existing]);

		const { wrapper } = await setup();

		expect(wrapper.find("[data-testid='annotator-comment-marker-existing-1']").exists()).toBe(true);
	});

	it("sends the current strokes and comments to flattenStrokesIntoPdf on save", async () => {
		const { wrapper } = await setup();
		const canvas = wrapper.find("[data-testid='annotator-ink-canvas']").element;

		await dispatchPointer(canvas, "pointerdown", { clientX: 10, clientY: 10, pointerId: 1 });
		await dispatchPointer(canvas, "pointermove", { clientX: 20, clientY: 20, pointerId: 1 });
		await dispatchPointer(canvas, "pointerup", { pointerId: 1 });

		await wrapper.find("[data-testid='annotator-comment-tool']").trigger("click");
		await wrapper.find("[data-testid='annotator-comment-layer']").trigger("click", { clientX: 100, clientY: 300 });
		await wrapper.find("[data-testid='annotator-comment-input'] textarea").setValue("please fix");
		await wrapper.find("[data-testid='annotator-comment-done']").trigger("click");

		await wrapper.find("[data-testid='annotator-save']").trigger("click");
		await flushPromises();

		expect(flattenStrokesIntoPdfMock).toHaveBeenCalledTimes(1);
		const [, strokes, comments] = flattenStrokesIntoPdfMock.mock.calls[0];
		expect(strokes).toHaveLength(1);
		expect(comments).toEqual([expect.objectContaining({ text: "please fix" })]);
	});

	it("commits an open comment popup on save instead of losing it", async () => {
		const { wrapper } = await setup();
		await wrapper.find("[data-testid='annotator-comment-tool']").trigger("click");
		await wrapper.find("[data-testid='annotator-comment-layer']").trigger("click", { clientX: 100, clientY: 300 });
		await wrapper.find("[data-testid='annotator-comment-input'] textarea").setValue("still open when saving");

		await wrapper.find("[data-testid='annotator-save']").trigger("click");
		await flushPromises();

		const [, , comments] = flattenStrokesIntoPdfMock.mock.calls[0];
		expect(comments).toEqual([expect.objectContaining({ text: "still open when saving" })]);
	});

	// Regression test for the ink flickering while drawing: drawStrokesOnCanvas clears the
	// canvas on every call, so redrawInk must combine the finished and in-progress strokes
	// into a single call rather than drawing them (and clearing) separately.
	it("draws finished and in-progress strokes together in a single pass while a new stroke is in progress", async () => {
		const { wrapper } = await setup();
		const canvas = wrapper.find("[data-testid='annotator-ink-canvas']").element;

		// finish one stroke first
		await dispatchPointer(canvas, "pointerdown", { clientX: 10, clientY: 10, pointerId: 1 });
		await dispatchPointer(canvas, "pointermove", { clientX: 15, clientY: 15, pointerId: 1 });
		await dispatchPointer(canvas, "pointerup", { pointerId: 1 });

		drawStrokesOnCanvasMock.mockClear();

		// start a second stroke and move it - the finished first stroke must still be visible
		await dispatchPointer(canvas, "pointerdown", { clientX: 50, clientY: 50, pointerId: 2 });
		await dispatchPointer(canvas, "pointermove", { clientX: 60, clientY: 60, pointerId: 2 });

		const lastCall = drawStrokesOnCanvasMock.mock.calls.at(-1);
		expect(lastCall).toBeDefined();
		const visibleStrokes = lastCall?.[1] as unknown[];
		expect(visibleStrokes).toHaveLength(2);
	});

	describe("iPad input handling", () => {
		it("draws with an Apple Pencil", async () => {
			const { wrapper } = await setup();
			const canvas = wrapper.find("[data-testid='annotator-ink-canvas']").element;
			drawStrokesOnCanvasMock.mockClear();

			await dispatchPointer(canvas, "pointerdown", { clientX: 10, clientY: 10, pointerId: 1, pointerType: "pen" });
			await dispatchPointer(canvas, "pointermove", { clientX: 20, clientY: 20, pointerId: 1, pointerType: "pen" });
			await dispatchPointer(canvas, "pointerup", { pointerId: 1, pointerType: "pen" });

			const lastCall = drawStrokesOnCanvasMock.mock.calls.at(-1);
			const visibleStrokes = lastCall?.[1] as { points: unknown[] }[];
			expect(visibleStrokes?.[0]?.points).toHaveLength(2);
		});

		it("does not draw with a finger while finger navigation is active (the default)", async () => {
			const { wrapper } = await setup();
			const canvas = wrapper.find("[data-testid='annotator-ink-canvas']").element;
			drawStrokesOnCanvasMock.mockClear();

			await dispatchPointer(canvas, "pointerdown", { clientX: 10, clientY: 10, pointerId: 1, pointerType: "touch" });
			await dispatchPointer(canvas, "pointermove", { clientX: 20, clientY: 20, pointerId: 1, pointerType: "touch" });
			await dispatchPointer(canvas, "pointerup", { pointerId: 1, pointerType: "touch" });

			expect(drawStrokesOnCanvasMock).not.toHaveBeenCalled();
		});

		it("draws with a finger once finger-draws mode is switched on", async () => {
			const { wrapper } = await setup();
			await wrapper.find("[data-testid='annotator-finger-mode']").trigger("click");
			const canvas = wrapper.find("[data-testid='annotator-ink-canvas']").element;
			drawStrokesOnCanvasMock.mockClear();

			await dispatchPointer(canvas, "pointerdown", { clientX: 10, clientY: 10, pointerId: 1, pointerType: "touch" });
			await dispatchPointer(canvas, "pointermove", { clientX: 20, clientY: 20, pointerId: 1, pointerType: "touch" });
			await dispatchPointer(canvas, "pointerup", { pointerId: 1, pointerType: "touch" });

			const lastCall = drawStrokesOnCanvasMock.mock.calls.at(-1);
			const visibleStrokes = lastCall?.[1] as { points: unknown[] }[];
			expect(visibleStrokes?.[0]?.points).toHaveLength(2);
		});

		it("switches finger navigation back on automatically once a pencil is seen", async () => {
			const { wrapper } = await setup();
			await wrapper.find("[data-testid='annotator-finger-mode']").trigger("click");
			expect(wrapper.find("[data-testid='annotator-finger-mode']").attributes("aria-label")).toBe(
				"components.cardElement.assignmentElement.annotator.fingerDraws"
			);

			const canvas = wrapper.find("[data-testid='annotator-ink-canvas']").element;
			await dispatchPointer(canvas, "pointerdown", { clientX: 10, clientY: 10, pointerId: 1, pointerType: "pen" });
			await dispatchPointer(canvas, "pointerup", { pointerId: 1, pointerType: "pen" });

			expect(wrapper.find("[data-testid='annotator-finger-mode']").attributes("aria-label")).toBe(
				"components.cardElement.assignmentElement.annotator.fingerNavigates"
			);
		});

		it("ignores a touch (palm) landing while a pencil is already drawing", async () => {
			const { wrapper } = await setup();
			const canvas = wrapper.find("[data-testid='annotator-ink-canvas']").element;

			await dispatchPointer(canvas, "pointerdown", { clientX: 10, clientY: 10, pointerId: 1, pointerType: "pen" });
			drawStrokesOnCanvasMock.mockClear();

			// the palm lands mid-stroke
			await dispatchPointer(canvas, "pointerdown", { clientX: 80, clientY: 80, pointerId: 2, pointerType: "touch" });
			await dispatchPointer(canvas, "pointermove", { clientX: 30, clientY: 30, pointerId: 1, pointerType: "pen" });

			const lastCall = drawStrokesOnCanvasMock.mock.calls.at(-1);
			const visibleStrokes = lastCall?.[1] as { points: unknown[] }[];
			// the pencil stroke kept growing - the palm contributed nothing
			expect(visibleStrokes?.[0]?.points).toHaveLength(2);
		});

		// Regression test: a palm resting mid-stroke is correctly ignored on landing, but
		// lifting it again used to fall through into "finish the current stroke" - cutting the
		// pencil's still-in-progress stroke short and dropping the pencil's own further
		// pointermove events, since they had nothing left to append to.
		it("does not cut a pencil stroke short when a palm that landed mid-stroke lifts again", async () => {
			const { wrapper } = await setup();
			const canvas = wrapper.find("[data-testid='annotator-ink-canvas']").element;

			await dispatchPointer(canvas, "pointerdown", { clientX: 10, clientY: 10, pointerId: 1, pointerType: "pen" });
			await dispatchPointer(canvas, "pointerdown", { clientX: 80, clientY: 80, pointerId: 2, pointerType: "touch" });
			await dispatchPointer(canvas, "pointerup", { pointerId: 2, pointerType: "touch" });

			drawStrokesOnCanvasMock.mockClear();
			await dispatchPointer(canvas, "pointermove", { clientX: 30, clientY: 30, pointerId: 1, pointerType: "pen" });

			const lastCall = drawStrokesOnCanvasMock.mock.calls.at(-1);
			const visibleStrokes = lastCall?.[1] as { points: unknown[] }[];
			// the pencil is still drawing the same, uninterrupted stroke
			expect(visibleStrokes?.[0]?.points).toHaveLength(2);

			await dispatchPointer(canvas, "pointerup", { pointerId: 1, pointerType: "pen" });
			expect(flattenStrokesIntoPdfMock).toHaveBeenCalledTimes(0);
			await wrapper.find("[data-testid='annotator-save']").trigger("click");
			await flushPromises();
			const [, strokes] = flattenStrokesIntoPdfMock.mock.calls[0];
			expect(strokes).toHaveLength(1);
			expect(strokes[0].points).toHaveLength(2);
		});

		it("pinch-zooms with two fingers and changes the stack transform", async () => {
			// two fingers navigate regardless of the finger-draws toggle (finger navigates by
			// default) - a lone pointer would need the toggle, a pinch never does
			const { wrapper } = await setup();
			const canvas = wrapper.find("[data-testid='annotator-ink-canvas']").element;
			const stack = wrapper.find(".annotator-canvas-stack");
			const transformBefore = (stack.element as HTMLElement).style.transform;

			await dispatchPointer(canvas, "pointerdown", { clientX: 100, clientY: 300, pointerId: 1, pointerType: "touch" });
			await dispatchPointer(canvas, "pointerdown", { clientX: 300, clientY: 300, pointerId: 2, pointerType: "touch" });
			await dispatchPointer(canvas, "pointermove", { clientX: 50, clientY: 300, pointerId: 1, pointerType: "touch" });
			await dispatchPointer(canvas, "pointermove", { clientX: 350, clientY: 300, pointerId: 2, pointerType: "touch" });

			const transformAfter = (stack.element as HTMLElement).style.transform;
			expect(transformAfter).not.toBe(transformBefore);
		});

		it("resets the view when 'fit to page' is clicked after a pinch", async () => {
			const { wrapper } = await setup();
			const canvas = wrapper.find("[data-testid='annotator-ink-canvas']").element;
			const stack = wrapper.find(".annotator-canvas-stack");

			await dispatchPointer(canvas, "pointerdown", { clientX: 100, clientY: 300, pointerId: 1, pointerType: "touch" });
			await dispatchPointer(canvas, "pointerdown", { clientX: 300, clientY: 300, pointerId: 2, pointerType: "touch" });
			await dispatchPointer(canvas, "pointermove", { clientX: 50, clientY: 300, pointerId: 1, pointerType: "touch" });
			await dispatchPointer(canvas, "pointermove", { clientX: 350, clientY: 300, pointerId: 2, pointerType: "touch" });

			const zoomedTransform = (stack.element as HTMLElement).style.transform;

			await wrapper.find("[data-testid='annotator-fit-to-page']").trigger("click");

			const resetTransform = (stack.element as HTMLElement).style.transform;
			expect(resetTransform).not.toBe(zoomedTransform);
		});
	});
});
