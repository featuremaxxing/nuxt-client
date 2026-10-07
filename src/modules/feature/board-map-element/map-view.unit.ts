import { createMapView, type MapViewOptions } from "./map-view";
import L from "leaflet";

// runs the real Leaflet; jsdom has no layout, so map events are fired directly
describe("map-view", () => {
	let container: HTMLDivElement;
	let createdMap: L.Map | undefined;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
		const originalMap = L.map;
		vi.spyOn(L, "map").mockImplementation((...args: Parameters<typeof L.map>) => {
			createdMap = originalMap(...args);
			return createdMap;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = "";
		createdMap = undefined;
	});

	const setup = (options: Partial<MapViewOptions> = {}) => {
		const onViewChange = vi.fn();
		const onMarkerChange = vi.fn();
		const controller = createMapView(container, {
			view: { latitude: 52.37, longitude: 9.73, zoom: 12 },
			isEditable: true,
			attribution: "© OpenStreetMap",
			markerLabel: "Marker",
			onViewChange,
			onMarkerChange,
			...options,
		});
		const map = createdMap as L.Map;
		return { controller, map, onViewChange, onMarkerChange };
	};

	const clickAt = (map: L.Map, latitude: number, longitude: number) => {
		map.fire("click", { latlng: L.latLng(latitude, longitude) });
	};

	it("should load tiles through the kibox.online proxy, never from openstreetmap.org", () => {
		const { map } = setup();

		const tileLayers: L.TileLayer[] = [];
		map.eachLayer((layer) => {
			if (layer instanceof L.TileLayer) tileLayers.push(layer);
		});
		expect(tileLayers).toHaveLength(1);
		expect((tileLayers[0] as unknown as { _url: string })._url).toBe("/map-tiles/{z}/{x}/{y}.png");
	});

	it("should not zoom with the mouse wheel, so the board keeps scrolling", () => {
		const { map } = setup();

		expect(map.scrollWheelZoom.enabled()).toBe(false);
	});

	it("should show the OpenStreetMap attribution", () => {
		setup();

		expect(container.querySelector(".leaflet-control-attribution")?.textContent).toContain("© OpenStreetMap");
	});

	describe("when editable", () => {
		it("should report a click as new marker position, rounded", () => {
			const { map, onMarkerChange } = setup();

			clickAt(map, 52.123456789, 9.987654321);

			expect(onMarkerChange).toHaveBeenCalledWith({ latitude: 52.123457, longitude: 9.987654 });
		});

		it("should report a changed zoom level", () => {
			const { map, onViewChange } = setup();

			map.setZoom(14, { animate: false });

			expect(onViewChange).toHaveBeenCalledWith(expect.objectContaining({ zoom: 14 }));
		});

		it("should not report the initial view", () => {
			const { map, onViewChange } = setup();

			map.fire("moveend");

			expect(onViewChange).not.toHaveBeenCalled();
		});

		it("should not report a view that was set from outside", () => {
			const { controller, onViewChange } = setup();

			controller.setView({ latitude: 48.137, longitude: 11.575, zoom: 13 });

			expect(onViewChange).not.toHaveBeenCalled();
		});
	});

	describe("when read-only", () => {
		it("should ignore clicks and view changes", () => {
			const { map, onMarkerChange, onViewChange } = setup({ isEditable: false });

			clickAt(map, 52.1, 9.9);
			map.setZoom(14, { animate: false });

			expect(onMarkerChange).not.toHaveBeenCalled();
			expect(onViewChange).not.toHaveBeenCalled();
		});

		it("should become editable again", () => {
			const { controller, map, onMarkerChange } = setup({ isEditable: false });

			controller.setEditable(true);
			clickAt(map, 52.1, 9.9);

			expect(onMarkerChange).toHaveBeenCalled();
		});
	});

	describe("marker", () => {
		const markerCount = (map: L.Map) => {
			let count = 0;
			map.eachLayer((layer) => {
				if (layer instanceof L.Marker) count++;
			});
			return count;
		};

		it("should show a stored marker", () => {
			const { map } = setup({ marker: { latitude: 52.37, longitude: 9.73 } });

			expect(markerCount(map)).toBe(1);
		});

		it("should move the one marker instead of adding another", () => {
			const { map } = setup({ marker: { latitude: 52.37, longitude: 9.73 } });

			clickAt(map, 52.4, 9.8);

			expect(markerCount(map)).toBe(1);
		});

		it("should remove the marker", () => {
			const { controller, map } = setup({ marker: { latitude: 52.37, longitude: 9.73 } });

			controller.setMarker(undefined);

			expect(markerCount(map)).toBe(0);
		});
	});

	it("should remove the map on destroy", () => {
		const { controller } = setup();

		controller.destroy();

		expect(container.querySelector(".leaflet-pane")).toBeNull();
	});
});
