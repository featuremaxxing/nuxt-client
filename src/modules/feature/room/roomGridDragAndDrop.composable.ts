import { ArrangementTarget } from "@data-room";
import { getSortableOptions } from "@util-sorting";
import Sortable, { MoveEvent, SortableEvent } from "sortablejs";
import { onBeforeUnmount, Ref, ref, watch } from "vue";

/**
 * Tuning values found with the click prototype: the center of a card collects, the edge sorts.
 * Holding still in the center for MERGE_DWELL_MS turns the target into a drop target for collecting.
 * Sorting only happens after the pointer stayed SWAP_DELAY_MS on the edge, so passing through a card
 * on the way to another card's center does not shuffle the grid.
 */
export const MERGE_ZONE_RATIO = 0.55;
export const MERGE_DWELL_MS = 400;
export const SWAP_DELAY_MS = 140;

export const TILE_SELECTOR = ".room-grid-tile";

export type RoomGridDropResult = {
	draggedType: "room" | "collection";
	draggedId: string;
	mergeTarget?: ArrangementTarget;
	mainOrder: ArrangementTarget[];
	panelRoomIds?: string[];
};

type Point = { x: number; y: number };

const toTarget = (el: Element): ArrangementTarget => ({
	type: (el as HTMLElement).dataset.entryType === "collection" ? "collection" : "room",
	id: (el as HTMLElement).dataset.entryId ?? "",
});

const isTile = (el: Element | null | undefined): el is HTMLElement =>
	!!el && el.matches(TILE_SELECTOR) && !el.classList.contains("sortable-fallback");

const tilesOf = (container: HTMLElement | null | undefined) =>
	container ? Array.from(container.children).filter(isTile) : [];

const pointOf = (event: Event | undefined): Point | undefined => {
	if (!event) return undefined;
	const touch = (event as TouchEvent).touches?.[0] ?? (event as TouchEvent).changedTouches?.[0];
	const { clientX, clientY } = touch ?? (event as MouseEvent);
	return clientX === undefined || clientY === undefined ? undefined : { x: clientX, y: clientY };
};

export const isInMergeZone = (el: Element, point: Point, ratio = MERGE_ZONE_RATIO) => {
	const rect = el.getBoundingClientRect();
	return (
		Math.abs(point.x - (rect.left + rect.width / 2)) <= (rect.width * ratio) / 2 &&
		Math.abs(point.y - (rect.top + rect.height / 2)) <= (rect.height * ratio) / 2
	);
};

export const useRoomGridDragAndDrop = (options: {
	gridRef: Readonly<Ref<HTMLElement | null | undefined>>;
	panelRef: Readonly<Ref<HTMLElement | null | undefined>>;
	canMergeInto: (dragged: ArrangementTarget, target: ArrangementTarget) => boolean;
	onDrop: (result: RoomGridDropResult) => void;
}) => {
	const isDragging = ref(false);

	let dragged: ArrangementTarget | undefined;
	let draggedEl: HTMLElement | undefined;
	let candidate: HTMLElement | undefined;
	let isMergeReady = false;
	let dwellTimer: ReturnType<typeof setTimeout> | undefined;
	let edgeTarget: Element | undefined;
	let edgeSince = 0;
	let domSnapshot: Array<{ container: HTMLElement; children: Node[] }> = [];

	const fallbackEl = () => document.querySelector(".sortable-fallback");

	const canMergeInto = (el: HTMLElement) => {
		if (!dragged || el === draggedEl || el.closest(".room-collection-panel")) return false;
		return options.canMergeInto(dragged, toTarget(el));
	};

	const clearCandidate = () => {
		clearTimeout(dwellTimer);
		candidate?.classList.remove("merge-pending", "merge-ready");
		fallbackEl()?.classList.remove("over-merge");
		candidate = undefined;
		isMergeReady = false;
	};

	const setCandidate = (el: HTMLElement) => {
		if (candidate === el) return;
		clearCandidate();
		candidate = el;
		el.classList.add("merge-pending");
		dwellTimer = setTimeout(() => {
			if (candidate !== el) return;
			isMergeReady = true;
			el.classList.replace("merge-pending", "merge-ready");
			fallbackEl()?.classList.add("over-merge");
			navigator.vibrate?.(12);
		}, MERGE_DWELL_MS);
	};

	// Sortable only reports moves over cards; gaps and leaving a card are tracked here
	const trackPointer = (event: Event) => {
		const point = pointOf(event);
		if (!point) return;
		if (candidate && !isInMergeZone(candidate, point)) clearCandidate();
		if (!candidate) {
			const hit = document.elementsFromPoint(point.x, point.y).find(isTile);
			if (hit && canMergeInto(hit) && isInMergeZone(hit, point)) setCandidate(hit);
		}
	};

	const onMove = (event: MoveEvent, originalEvent: Event) => {
		const target = event.related;
		const point = pointOf(originalEvent);
		if (!isTile(target) || !point) return true;

		// never sort while in the center, otherwise the target slides away under the pointer
		if (canMergeInto(target) && isInMergeZone(target, point)) {
			setCandidate(target);
			edgeTarget = undefined;
			return false;
		}
		if (candidate === target) clearCandidate();

		const now = performance.now();
		if (edgeTarget !== target) {
			edgeTarget = target;
			edgeSince = now;
		}
		return now - edgeSince >= SWAP_DELAY_MS;
	};

	const takeDomSnapshot = () => {
		domSnapshot = [options.gridRef.value, options.panelRef.value]
			.filter((container): container is HTMLElement => !!container)
			.map((container) => ({
				container,
				// the dragged clone is removed by Sortable itself and must not come back
				children: Array.from(container.childNodes).filter(
					(node) => !(node instanceof HTMLElement && node.classList.contains("sortable-fallback"))
				),
			}));
	};

	// Vue owns the DOM: undo what Sortable moved and let the new state render it
	const restoreDom = () => {
		domSnapshot.forEach(({ container, children }) => children.forEach((child) => container.appendChild(child)));
		domSnapshot = [];
	};

	const onStart = (event: SortableEvent) => {
		draggedEl = event.item;
		dragged = toTarget(event.item);
		edgeTarget = undefined;
		isDragging.value = true;
		document.addEventListener("mousemove", trackPointer, true);
		document.addEventListener("touchmove", trackPointer, { capture: true, passive: true });
	};

	const onEnd = () => {
		document.removeEventListener("mousemove", trackPointer, true);
		document.removeEventListener("touchmove", trackPointer, true);

		const mergeTarget = isMergeReady && candidate ? toTarget(candidate) : undefined;
		const result: RoomGridDropResult | undefined = dragged && {
			draggedType: dragged.type,
			draggedId: dragged.id,
			mergeTarget,
			mainOrder: tilesOf(options.gridRef.value).map(toTarget),
			panelRoomIds: options.panelRef.value ? tilesOf(options.panelRef.value).map((el) => toTarget(el).id) : undefined,
		};

		clearCandidate();
		restoreDom();
		dragged = undefined;
		draggedEl = undefined;
		// keep isDragging until the click that may follow the drop was swallowed
		setTimeout(() => (isDragging.value = false));

		if (result) options.onDrop(result);
	};

	const sortableOptions = (put: Sortable.GroupOptions["put"], sort = true) =>
		getSortableOptions({
			sort,
			draggable: TILE_SELECTOR,
			filter: ".no-drag",
			preventOnFilter: false,
			group: { name: "room-grid", pull: true, put },
			onStart: (event) => {
				takeDomSnapshot();
				onStart(event);
			},
			onMove,
			onEnd,
		});

	let gridSortable: Sortable | undefined;
	let panelSortable: Sortable | undefined;

	watch(
		options.gridRef,
		(el) => {
			gridSortable?.destroy();
			gridSortable = el ? Sortable.create(el, sortableOptions(true)) : undefined;
		},
		{ immediate: true }
	);

	watch(
		options.panelRef,
		(el) => {
			panelSortable?.destroy();
			// collections stay flat: only rooms can be put into the open collection.
			// Rooms inside are listed alphabetically, so there is nothing to sort.
			panelSortable = el
				? Sortable.create(
						el,
						sortableOptions((_to, _from, dragEl) => (dragEl as HTMLElement).dataset.entryType === "room", false)
					)
				: undefined;
		},
		{ immediate: true }
	);

	onBeforeUnmount(() => {
		gridSortable?.destroy();
		panelSortable?.destroy();
		clearCandidate();
	});

	return { isDragging };
};
