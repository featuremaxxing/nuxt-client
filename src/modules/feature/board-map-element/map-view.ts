import "leaflet/dist/leaflet.css";
import { mdiMapMarker } from "@icons/material";
import L from "leaflet";

// Loaded lazily by MapContentElement, so Leaflet only ends up in the chunk that
// is fetched once a map element becomes visible.

// Tiles are proxied by kibox.online (nbc-teststack Caddy), so the browsers of
// teachers and students never contact the OpenStreetMap servers directly.
const TILE_URL = "/map-tiles/{z}/{x}/{y}.png";
export const MAX_ZOOM = 19;

export type MapViewState = {
	latitude: number;
	longitude: number;
	zoom: number;
};

export type MapMarkerPosition = {
	latitude: number;
	longitude: number;
};

export type MapViewOptions = {
	view: MapViewState;
	marker?: MapMarkerPosition;
	isEditable: boolean;
	attribution: string;
	markerLabel: string;
	onViewChange: (view: MapViewState) => void;
	onMarkerChange: (marker: MapMarkerPosition) => void;
};

export type MapViewController = {
	setEditable(isEditable: boolean): void;
	setView(view: MapViewState): void;
	setMarker(marker: MapMarkerPosition | undefined): void;
	invalidateSize(): void;
	destroy(): void;
};

// ~10 cm precision, keeps the stored numbers short
const round = (value: number) => Math.round(value * 1e6) / 1e6;

const toPosition = (latLng: L.LatLng): MapMarkerPosition => {
	const wrapped = latLng.wrap();
	return { latitude: round(wrapped.lat), longitude: round(wrapped.lng) };
};

const markerIcon = L.divIcon({
	className: "map-element-marker",
	html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><path fill="currentColor" d="${mdiMapMarker}"/></svg>`,
	iconSize: [36, 36],
	iconAnchor: [18, 33],
});

export const createMapView = (container: HTMLElement, options: MapViewOptions): MapViewController => {
	let isEditable = options.isEditable;
	// the last view that is stored (or was reported as changed)
	let knownView: MapViewState = options.view;

	const map = L.map(container, {
		center: [options.view.latitude, options.view.longitude],
		zoom: options.view.zoom,
		maxZoom: MAX_ZOOM,
		// the mouse wheel keeps scrolling the board, zooming works with the +/- buttons
		scrollWheelZoom: false,
		worldCopyJump: true,
	});
	map.attributionControl.setPrefix(false);
	L.tileLayer(TILE_URL, { maxZoom: MAX_ZOOM, attribution: options.attribution }).addTo(map);

	let marker: L.Marker | undefined;

	const applyEditable = () => {
		container.classList.toggle("map-element--editable", isEditable);
		if (marker?.dragging) {
			if (isEditable) marker.dragging.enable();
			else marker.dragging.disable();
		}
		// a one-finger drag over a read-only map should scroll the page, not pan the map
		if (L.Browser.touch && !isEditable) map.dragging.disable();
		else map.dragging.enable();
	};

	const placeMarker = (position: MapMarkerPosition) => {
		const latLng = L.latLng(position.latitude, position.longitude);
		if (marker) {
			marker.setLatLng(latLng);
			return;
		}
		marker = L.marker(latLng, {
			icon: markerIcon,
			title: options.markerLabel,
			alt: options.markerLabel,
			draggable: isEditable,
			autoPan: true,
		}).addTo(map);
		marker.on("dragend", () => {
			if (marker) options.onMarkerChange(toPosition(marker.getLatLng()));
		});
	};

	const removeMarker = () => {
		marker?.remove();
		marker = undefined;
	};

	if (options.marker) placeMarker(options.marker);
	applyEditable();

	// Leaflet snaps the center to whole pixels and fires moveend for programmatic
	// changes too - only a move of at least one pixel or a new zoom level counts
	const hasMovedFromKnownView = () => {
		const zoom = map.getZoom();
		if (zoom !== knownView.zoom) return true;
		const known = map.project([knownView.latitude, knownView.longitude], zoom);
		return known.distanceTo(map.project(map.getCenter(), zoom)) >= 1;
	};

	map.on("moveend", () => {
		if (!isEditable || !hasMovedFromKnownView()) return;
		knownView = { ...toPosition(map.getCenter()), zoom: map.getZoom() };
		options.onViewChange(knownView);
	});

	map.on("click", (event: L.LeafletMouseEvent) => {
		if (!isEditable) return;
		const position = toPosition(event.latlng);
		placeMarker(position);
		options.onMarkerChange(position);
	});

	return {
		setEditable(value) {
			isEditable = value;
			applyEditable();
		},
		setView(view) {
			knownView = view;
			map.setView([view.latitude, view.longitude], view.zoom, { animate: false });
		},
		setMarker(position) {
			if (position) placeMarker(position);
			else removeMarker();
		},
		invalidateSize() {
			map.invalidateSize();
		},
		destroy() {
			map.remove();
		},
	};
};
