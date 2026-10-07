import { createMapView, type MapViewOptions } from "./map-view";
import MapContentElement from "./MapContentElement.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { ContentElementType, MapElementContent } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { ref } from "vue";

vi.mock("./map-view", () => ({ createMapView: vi.fn() }));

vi.mock("@data-board", () => ({
	useBoardFocusHandler: vi.fn(),
	useContentElementState: (props: { element: { content: object } }) => ({ modelValue: ref(props.element.content) }),
}));

const askDeletionForType = vi.fn();
vi.mock("@/utils/confirmation-dialog.utils", () => ({
	askDeletionForType: (...args: unknown[]) => askDeletionForType(...args),
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

describe("MapContentElement", () => {
	let originalIntersectionObserver: typeof IntersectionObserver;
	const controller = {
		setEditable: vi.fn(),
		setView: vi.fn(),
		setMarker: vi.fn(),
		invalidateSize: vi.fn(),
		destroy: vi.fn(),
	};

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		originalIntersectionObserver = window.IntersectionObserver;
		window.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
		vi.mocked(createMapView).mockReturnValue(controller);
	});

	afterEach(() => {
		window.IntersectionObserver = originalIntersectionObserver;
		vi.clearAllMocks();
		document.body.innerHTML = "";
	});

	const setup = async (content: Partial<MapElementContent> = {}, isEditMode = false) => {
		const wrapper = mount(MapContentElement, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				// render the menu items without opening the menu
				stubs: { BoardMenu: { template: "<div><slot /></div>" } },
			},
			props: {
				element: {
					id: "element-id",
					type: ContentElementType.MAP,
					content: { latitude: 52.37, longitude: 9.73, zoom: 12, ...content },
					timestamps: { createdAt: "", lastUpdatedAt: "" },
				},
				isEditMode,
			},
			attachTo: document.body,
		});
		await flushPromises();
		const options = vi.mocked(createMapView).mock.calls[0]?.[1] as MapViewOptions;
		return { wrapper, options };
	};

	it("should create the map with the stored excerpt and marker once visible", async () => {
		const { wrapper, options } = await setup({ marker: { latitude: 52.371, longitude: 9.735 } });

		expect(createMapView).toHaveBeenCalledWith(
			wrapper.find("[data-testid='map-element-map']").element,
			expect.anything()
		);
		expect(options.view).toEqual({ latitude: 52.37, longitude: 9.73, zoom: 12 });
		expect(options.marker).toEqual({ latitude: 52.371, longitude: 9.735 });
		expect(options.isEditable).toBe(false);
		expect(options.attribution).toBe("components.cardElement.mapElement.attribution");
	});

	it("should not start a card drag when panning the map", async () => {
		const { wrapper } = await setup();

		expect(wrapper.find("[data-testid='map-element-map']").classes()).toContain("prevent-card-drag");
	});

	it("should keep arrow keys and double clicks inside the map", async () => {
		const { wrapper } = await setup();
		const onKeydown = vi.fn();
		const onDblclick = vi.fn();
		wrapper.element.addEventListener("keydown", onKeydown);
		wrapper.element.addEventListener("dblclick", onDblclick);
		const map = wrapper.find("[data-testid='map-element-map']");

		await map.trigger("keydown", { key: "ArrowLeft" });
		await map.trigger("dblclick");

		expect(onKeydown).not.toHaveBeenCalled();
		expect(onDblclick).not.toHaveBeenCalled();
	});

	describe("in edit mode", () => {
		it("should store a new excerpt", async () => {
			const { wrapper, options } = await setup({}, true);

			options.onViewChange({ latitude: 48.137, longitude: 11.575, zoom: 15 });

			expect(wrapper.props("element").content).toEqual(
				expect.objectContaining({ latitude: 48.137, longitude: 11.575, zoom: 15 })
			);
		});

		it("should store a new marker and offer to remove it", async () => {
			const { wrapper, options } = await setup({}, true);
			expect(wrapper.find("[data-testid='map-element-remove-marker']").exists()).toBe(false);

			options.onMarkerChange({ latitude: 52.4, longitude: 9.8 });
			await flushPromises();

			expect(wrapper.props("element").content.marker).toEqual({ latitude: 52.4, longitude: 9.8 });
			expect(wrapper.find("[data-testid='map-element-remove-marker']").exists()).toBe(true);
		});

		it("should remove the marker", async () => {
			const { wrapper } = await setup({ marker: { latitude: 52.4, longitude: 9.8 } }, true);

			await wrapper.find("[data-testid='map-element-remove-marker']").trigger("click");

			expect(wrapper.props("element").content.marker).toBeUndefined();
			expect(controller.setMarker).toHaveBeenCalledWith(undefined);
		});

		it("should explain how to choose the excerpt", async () => {
			const { wrapper } = await setup({}, true);

			expect(wrapper.find("[data-testid='map-element-hint']").text()).toBe(
				"components.cardElement.mapElement.editHint"
			);
		});

		it("should delete the element after confirmation", async () => {
			askDeletionForType.mockResolvedValue(true);
			const { wrapper } = await setup({}, true);

			await wrapper.find("[data-testid='kebab-menu-action-delete']").trigger("click");
			await flushPromises();

			expect(wrapper.emitted("delete:element")).toEqual([["element-id"]]);
		});
	});

	it("should switch the map between editable and read-only", async () => {
		const { wrapper } = await setup();

		await wrapper.setProps({ isEditMode: true });

		expect(controller.setEditable).toHaveBeenCalledWith(true);
	});

	it("should follow changes made by others while it is only shown", async () => {
		const { wrapper } = await setup();

		await wrapper.setProps({
			element: {
				...wrapper.props("element"),
				content: { latitude: 48.137, longitude: 11.575, zoom: 9, marker: { latitude: 48.1, longitude: 11.5 } },
			},
		});

		expect(controller.setView).toHaveBeenCalledWith({ latitude: 48.137, longitude: 11.575, zoom: 9 });
		expect(controller.setMarker).toHaveBeenCalledWith({ latitude: 48.1, longitude: 11.5 });
	});

	it("should show an error when the map cannot be loaded", async () => {
		vi.mocked(createMapView).mockImplementation(() => {
			throw new Error("no map");
		});

		const { wrapper } = await setup();

		expect(wrapper.find("[data-testid='map-element-error']").text()).toBe(
			"components.cardElement.mapElement.loadError"
		);
	});

	it("should remove the map when unmounted", async () => {
		const { wrapper } = await setup();

		wrapper.unmount();

		expect(controller.destroy).toHaveBeenCalled();
	});
});
