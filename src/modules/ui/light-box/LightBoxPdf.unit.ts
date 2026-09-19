import LightBoxPdf from "./LightBoxPdf.vue";
import type { PdfComment } from "@/utils/pdf-annotation";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { flushPromises, mount } from "@vue/test-utils";

const { loadPdfMock, renderPdfPageToCanvasMock, readPdfCommentsMock } = vi.hoisted(() => ({
	loadPdfMock: vi.fn(),
	renderPdfPageToCanvasMock: vi.fn(),
	readPdfCommentsMock: vi.fn(),
}));

vi.mock("@/utils/pdf-renderer", () => ({
	loadPdf: loadPdfMock,
	renderPdfPageToCanvas: renderPdfPageToCanvasMock,
}));

vi.mock("@/utils/pdf-annotation", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/utils/pdf-annotation")>();

	return { ...actual, readPdfComments: readPdfCommentsMock };
});

class FakeIntersectionObserver {
	constructor(private readonly callback: IntersectionObserverCallback) {}

	observe(target: Element) {
		this.callback(
			[{ isIntersecting: true, target } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}

	disconnect() {
		// no-op
	}
}

describe("LightBoxPdf", () => {
	let originalFetch: typeof fetch;
	let originalIntersectionObserver: typeof IntersectionObserver;
	let originalRequestAnimationFrame: typeof requestAnimationFrame;

	beforeEach(() => {
		loadPdfMock.mockResolvedValue({ numPages: 1, destroy: vi.fn() });
		renderPdfPageToCanvasMock.mockResolvedValue({ width: 400, height: 600 });
		readPdfCommentsMock.mockResolvedValue([]);

		originalFetch = global.fetch;
		global.fetch = vi
			.fn()
			.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) }) as unknown as typeof fetch;

		// jsdom has no IntersectionObserver - a stub that fires "intersecting"
		// immediately keeps the lazy-render logic working without a real viewport
		originalIntersectionObserver = global.IntersectionObserver;
		global.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;

		// jsdom's requestAnimationFrame is timer-based and would need real timer
		// advancement - resolve it synchronously so the init()-await settles with flushPromises
		originalRequestAnimationFrame = global.requestAnimationFrame;
		global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
			cb(0);

			return 0;
		}) as typeof requestAnimationFrame;
	});

	afterEach(() => {
		vi.clearAllMocks();
		global.fetch = originalFetch;
		global.IntersectionObserver = originalIntersectionObserver;
		global.requestAnimationFrame = originalRequestAnimationFrame;
	});

	const setup = async (url = "https://api/files/essay.pdf") => {
		const wrapper = mount(LightBoxPdf, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { url },
		});

		await flushPromises();
		await flushPromises();

		return { wrapper };
	};

	it("shows a marker for each comment on the rendered page", async () => {
		const comment: PdfComment = { id: "c1", pageIndex: 0, x: 0.3, y: 0.5, text: "please redo this" };
		readPdfCommentsMock.mockResolvedValue([comment]);

		const { wrapper } = await setup();

		expect(wrapper.find("[data-testid='light-box-pdf-comment-marker-c1']").exists()).toBe(true);
	});

	it("shows no markers when the PDF has no comments", async () => {
		const { wrapper } = await setup();

		expect(wrapper.findAll("[data-testid^='light-box-pdf-comment-marker-']")).toHaveLength(0);
	});

	it("opens the comment text on marker click and closes it again on a second click", async () => {
		const comment: PdfComment = { id: "c1", pageIndex: 0, x: 0.3, y: 0.5, text: "please redo this" };
		readPdfCommentsMock.mockResolvedValue([comment]);

		const { wrapper } = await setup();
		const marker = wrapper.find("[data-testid='light-box-pdf-comment-marker-c1']");

		await marker.trigger("click");
		expect(wrapper.find("[data-testid='light-box-pdf-comment-popup']").text()).toBe("please redo this");

		await marker.trigger("click");
		expect(wrapper.find("[data-testid='light-box-pdf-comment-popup']").exists()).toBe(false);
	});

	it("closes the open comment when clicking elsewhere on the page", async () => {
		const comment: PdfComment = { id: "c1", pageIndex: 0, x: 0.3, y: 0.5, text: "please redo this" };
		readPdfCommentsMock.mockResolvedValue([comment]);

		const { wrapper } = await setup();
		await wrapper.find("[data-testid='light-box-pdf-comment-marker-c1']").trigger("click");
		expect(wrapper.find("[data-testid='light-box-pdf-comment-popup']").exists()).toBe(true);

		await wrapper.find("[data-testid='light-box-pdf']").trigger("click");

		expect(wrapper.find("[data-testid='light-box-pdf-comment-popup']").exists()).toBe(false);
	});

	it("never offers a way to edit the comment - it is read-only here", async () => {
		const comment: PdfComment = { id: "c1", pageIndex: 0, x: 0.3, y: 0.5, text: "please redo this" };
		readPdfCommentsMock.mockResolvedValue([comment]);

		const { wrapper } = await setup();
		await wrapper.find("[data-testid='light-box-pdf-comment-marker-c1']").trigger("click");

		expect(wrapper.find("textarea").exists()).toBe(false);
		expect(wrapper.find("[data-testid='light-box-pdf-comment-popup']").find("button").exists()).toBe(false);
	});
});
