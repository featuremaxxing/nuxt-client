import { createModel3dViewer, loadModel3d } from "./model-3d-viewer";
import Model3dDisplay from "./Model3dDisplay.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { flushPromises, mount } from "@vue/test-utils";
import { Object3D } from "three";
import type { ComponentProps } from "vue-component-type-helpers";

vi.mock("./model-3d-viewer", () => ({
	loadModel3d: vi.fn(),
	createModel3dViewer: vi.fn(),
}));

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

describe("Model3dDisplay", () => {
	let originalFetch: typeof fetch;
	let originalIntersectionObserver: typeof IntersectionObserver;
	const viewer = { resize: vi.fn(), dispose: vi.fn() };
	const model = new Object3D();

	beforeEach(() => {
		originalFetch = global.fetch;
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(8),
		}) as unknown as typeof fetch;

		originalIntersectionObserver = window.IntersectionObserver;
		window.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;

		vi.mocked(loadModel3d).mockResolvedValue(model);
		vi.mocked(createModel3dViewer).mockReturnValue(viewer);
	});

	afterEach(() => {
		global.fetch = originalFetch;
		window.IntersectionObserver = originalIntersectionObserver;
		vi.clearAllMocks();
		document.body.innerHTML = "";
	});

	const setup = async (props: Partial<ComponentProps<typeof Model3dDisplay>> = {}) => {
		const wrapper = mount(Model3dDisplay, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: {
				src: "/api/v3/file/download/file-id/model.stl",
				name: "model.stl",
				format: "stl",
				size: 1024,
				showMenu: false,
				...props,
			},
			slots: { default: "<div data-testid='menu-content' />" },
			attachTo: document.body,
		});
		await flushPromises();
		return { wrapper };
	};

	it("should download the file and render it once visible", async () => {
		const { wrapper } = await setup();

		expect(global.fetch).toHaveBeenCalledWith("/api/v3/file/download/file-id/model.stl", expect.anything());
		expect(loadModel3d).toHaveBeenCalledWith(expect.any(ArrayBuffer), "stl");
		const canvas = wrapper.find("[data-testid='model-3d-canvas']");
		expect(createModel3dViewer).toHaveBeenCalledWith(canvas.element, model);
		expect(canvas.isVisible()).toBe(true);
		expect(wrapper.find("[data-testid='model-3d-loading']").exists()).toBe(false);
	});

	it("should label the canvas for screen readers", async () => {
		const { wrapper } = await setup();

		const canvas = wrapper.find("[data-testid='model-3d-canvas']");
		expect(canvas.attributes("role")).toBe("img");
		expect(canvas.attributes("aria-label")).toBe("components.cardElement.fileElement.model3d.label");
	});

	it("should not start a card drag when rotating the model", async () => {
		const { wrapper } = await setup();

		expect(wrapper.find("[data-testid='model-3d-display']").classes()).toContain("prevent-card-drag");
	});

	it("should not download files that are too large for a preview", async () => {
		const { wrapper } = await setup({ size: 60 * 1024 * 1024 });

		expect(global.fetch).not.toHaveBeenCalled();
		expect(wrapper.find("[data-testid='model-3d-error']").text()).toBe(
			"components.cardElement.fileElement.model3d.error.tooLarge"
		);
	});

	it("should explain that glTF files with external resources cannot be shown", async () => {
		vi.mocked(loadModel3d).mockRejectedValue(new Error("external-resources"));

		const { wrapper } = await setup({ name: "scene.gltf", format: "gltf" });

		expect(wrapper.find("[data-testid='model-3d-error']").text()).toBe(
			"components.cardElement.fileElement.model3d.error.externalResources"
		);
		expect(createModel3dViewer).not.toHaveBeenCalled();
	});

	it("should show a generic error when the download fails", async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;

		const { wrapper } = await setup();

		expect(wrapper.find("[data-testid='model-3d-error']").text()).toBe(
			"components.cardElement.fileElement.model3d.error.failed"
		);
	});

	it("should free the WebGL resources when unmounted", async () => {
		const { wrapper } = await setup();

		wrapper.unmount();

		expect(viewer.dispose).toHaveBeenCalled();
	});

	it("should render the menu when requested", async () => {
		const { wrapper } = await setup({ showMenu: true });

		expect(wrapper.find("[data-testid='menu-content']").exists()).toBe(true);
	});
});
