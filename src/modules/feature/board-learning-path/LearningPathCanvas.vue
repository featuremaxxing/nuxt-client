<template>
	<div
		ref="viewport"
		class="lp-canvas"
		:class="{ 'lp-canvas--panning': interaction?.kind === 'pan', 'lp-canvas--drop': isDropTarget }"
		data-testid="learning-path-canvas"
		tabindex="-1"
		@pointerdown="onBackgroundPointerDown"
		@keydown="onCanvasKeydown"
		@wheel="onWheel"
		@dragover="onDragOver"
		@dragleave="isDropTarget = false"
		@drop="onDrop"
	>
		<div class="lp-canvas__stage" :style="stageStyle">
			<svg class="lp-canvas__edges" width="1" height="1" aria-hidden="true">
				<defs>
					<marker
						:id="markerId"
						viewBox="0 0 10 10"
						refX="9"
						refY="5"
						markerWidth="8"
						markerHeight="8"
						orient="auto-start-reverse"
					>
						<path d="M 0 0 L 10 5 L 0 10 z" class="lp-canvas__arrow-head" />
					</marker>
				</defs>
				<path
					v-for="edge in edgePaths"
					:key="edge.key"
					:d="edge.d"
					class="lp-canvas__edge"
					:class="{
						'lp-canvas__edge--active': edge.isActive,
						'lp-canvas__edge--locked': edge.isLocked,
						'lp-canvas__edge--selected': edge.key === selectedEdgeKey,
					}"
					:marker-end="`url(#${markerId})`"
					data-testid="learning-path-edge"
				/>
				<!-- editors click an arrow on a wider, invisible line to select it -->
				<template v-if="isEditor">
					<path
						v-for="edge in edgePaths"
						:key="`hit-${edge.key}`"
						:d="edge.d"
						class="lp-canvas__edge-hit"
						:data-testid="`learning-path-edge-hit-${edge.key}`"
						@pointerdown.stop="onEdgePointerDown($event, edge.key)"
					/>
				</template>
				<path
					v-if="draftEdge"
					:d="draftEdge"
					class="lp-canvas__edge lp-canvas__edge--draft"
					:marker-end="`url(#${markerId})`"
				/>
			</svg>
			<VBtn
				v-if="selectedEdge"
				:icon="mdiClose"
				size="x-small"
				color="error"
				class="lp-canvas__edge-remove"
				:style="{ left: `${selectedEdge.middle.x}px`, top: `${selectedEdge.middle.y}px` }"
				:aria-label="t('pages.learningPath.edge.remove')"
				data-testid="learning-path-edge-remove"
				@pointerdown.stop
				@click="removeSelectedEdge"
			/>
			<LearningPathTile
				v-for="step in steps"
				:key="step.id"
				:step="step"
				:is-editor="isEditor"
				:is-selected="step.id === selectedStepId"
				:color="color"
				:hint="hints[step.id]"
				:style="tileStyle(step)"
				@pointerdown.stop="onTilePointerDown($event, step)"
				@click="onTileClick($event, step)"
				@keydown="onTileKeydown($event, step)"
				@handle-pointerdown="(event, side) => onHandlePointerDown(event, step, side)"
			/>
		</div>

		<div class="lp-canvas__controls" @pointerdown.stop>
			<VBtn
				:icon="mdiMagnifyPlusOutline"
				size="small"
				variant="text"
				:aria-label="t('pages.learningPath.zoomIn')"
				data-testid="learning-path-zoom-in"
				@click="zoomBy(1.2)"
			/>
			<VBtn
				:icon="mdiMagnifyMinusOutline"
				size="small"
				variant="text"
				:aria-label="t('pages.learningPath.zoomOut')"
				data-testid="learning-path-zoom-out"
				@click="zoomBy(1 / 1.2)"
			/>
			<VBtn
				:icon="mdiFitToScreenOutline"
				size="small"
				variant="text"
				:aria-label="t('pages.learningPath.fit')"
				data-testid="learning-path-fit"
				@click="fitView"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	anchorOf,
	BOARD_DRAG_TYPE,
	CARD_DRAG_TYPE,
	curveBetween,
	edgeBetween,
	edgeMiddle,
	type Side,
	TILE_HEIGHT,
	TILE_WIDTH,
} from "./canvas";
import LearningPathTile from "./LearningPathTile.vue";
import { edgesOf, type LearningPathStep } from "@data-board-learning-path";
import { mdiClose, mdiFitToScreenOutline, mdiMagnifyMinusOutline, mdiMagnifyPlusOutline } from "@icons/material";
import { computed, onBeforeUnmount, PropType, ref, useId } from "vue";
import { useI18n } from "vue-i18n";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.5;
const KEYBOARD_STEP = 20;
// a pointer that moved less than this is a click, not a drag
const CLICK_TOLERANCE = 4;

const props = defineProps({
	steps: { type: Array as PropType<LearningPathStep[]>, required: true },
	isEditor: { type: Boolean, default: false },
	// the color of the learning path, as a css color
	color: { type: String, default: undefined },
	selectedStepId: { type: String, default: undefined },
	hints: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
});

const emit = defineEmits<{
	(e: "select", stepId: string | undefined): void;
	(e: "open", step: LearningPathStep): void;
	(e: "move", stepId: string, positionX: number, positionY: number): void;
	(e: "connect", fromId: string, toId: string): void;
	(e: "disconnect", fromId: string, toId: string): void;
	(e: "drop-board", boardId: string, positionX: number, positionY: number): void;
	(e: "drop-card", boardId: string, cardId: string, positionX: number, positionY: number): void;
}>();

const { t } = useI18n();
const markerId = `lp-arrow-${useId()}`;

const viewport = ref<HTMLElement>();
const zoom = ref(1);
const pan = ref({ x: 24, y: 24 });
const isDropTarget = ref(false);

type Interaction =
	| { kind: "pan"; startX: number; startY: number; panX: number; panY: number }
	| { kind: "drag"; step: LearningPathStep; startX: number; startY: number; x: number; y: number; moved: boolean }
	| { kind: "connect"; from: LearningPathStep; side: Side; x: number; y: number };

const interaction = ref<Interaction>();

const stageStyle = computed(() => ({
	transform: `translate(${pan.value.x}px, ${pan.value.y}px) scale(${zoom.value})`,
}));

const positionOf = (step: LearningPathStep): { x: number; y: number } => {
	const current = interaction.value;
	if (current?.kind === "drag" && current.step.id === step.id) return { x: current.x, y: current.y };
	return { x: step.positionX, y: step.positionY };
};

const tileStyle = (step: LearningPathStep) => {
	const { x, y } = positionOf(step);
	return { left: `${x}px`, top: `${y}px` };
};

const edgePaths = computed(() => {
	const byId = new Map(props.steps.map((step) => [step.id, step]));

	return edgesOf(props.steps).map(({ fromId, toId }) => {
		const to = byId.get(toId) as LearningPathStep;
		const from = positionOf(byId.get(fromId) as LearningPathStep);
		return {
			key: `${fromId}-${toId}`,
			fromId,
			toId,
			d: edgeBetween(from, positionOf(to)),
			middle: edgeMiddle(from, positionOf(to)),
			isActive: props.selectedStepId === toId || props.selectedStepId === fromId,
			isLocked: !props.isEditor && to.status === "locked",
		};
	});
});

// an arrow selected by an editor, to remove it
const selectedEdgeKey = ref<string>();
const selectedEdge = computed(() => edgePaths.value.find((edge) => edge.key === selectedEdgeKey.value));

const onEdgePointerDown = (event: PointerEvent, key: string) => {
	if (event.button !== 0) return;
	selectedEdgeKey.value = key;
	// for the delete key
	viewport.value?.focus({ preventScroll: true });
};

const removeSelectedEdge = () => {
	const edge = selectedEdge.value;
	if (!edge) return;
	selectedEdgeKey.value = undefined;
	emit("disconnect", edge.fromId, edge.toId);
};

const onCanvasKeydown = (event: KeyboardEvent) => {
	if (!selectedEdge.value) return;
	if (event.key === "Delete" || event.key === "Backspace") {
		event.preventDefault();
		removeSelectedEdge();
	} else if (event.key === "Escape") {
		selectedEdgeKey.value = undefined;
	}
};

const draftEdge = computed(() => {
	const current = interaction.value;
	if (current?.kind !== "connect") return undefined;
	return curveBetween(anchorOf(positionOf(current.from), current.side), current.side, { x: current.x, y: current.y });
});

// --- coordinates ---

const toCanvas = (clientX: number, clientY: number): { x: number; y: number } => {
	const rect = viewport.value?.getBoundingClientRect();
	return {
		x: (clientX - (rect?.left ?? 0) - pan.value.x) / zoom.value,
		y: (clientY - (rect?.top ?? 0) - pan.value.y) / zoom.value,
	};
};

const stepAt = (x: number, y: number): LearningPathStep | undefined =>
	props.steps.find((step) => {
		const position = positionOf(step);
		return x >= position.x && x <= position.x + TILE_WIDTH && y >= position.y && y <= position.y + TILE_HEIGHT;
	});

// --- pointer interactions ---

// Moves and the release are followed on the window, so a pointer that leaves the canvas while
// dragging is not lost. No pointer capture: it would retarget the release, and with it the
// click, away from the tile.
const capture = () => {
	window.addEventListener("pointermove", onPointerMove);
	window.addEventListener("pointerup", onPointerUp);
	window.addEventListener("pointercancel", onPointerUp);
};

const release = () => {
	window.removeEventListener("pointermove", onPointerMove);
	window.removeEventListener("pointerup", onPointerUp);
	window.removeEventListener("pointercancel", onPointerUp);
	interaction.value = undefined;
};

const onBackgroundPointerDown = (event: PointerEvent) => {
	if (event.button !== 0) return;
	interaction.value = {
		kind: "pan",
		startX: event.clientX,
		startY: event.clientY,
		panX: pan.value.x,
		panY: pan.value.y,
	};
	capture();
};

const onTilePointerDown = (event: PointerEvent, step: LearningPathStep) => {
	if (!props.isEditor || event.button !== 0) return;
	interaction.value = {
		kind: "drag",
		step,
		startX: event.clientX,
		startY: event.clientY,
		x: step.positionX,
		y: step.positionY,
		moved: false,
	};
	capture();
};

const onHandlePointerDown = (event: PointerEvent, step: LearningPathStep, side: Side) => {
	const { x, y } = toCanvas(event.clientX, event.clientY);
	interaction.value = { kind: "connect", from: step, side, x, y };
	capture();
};

const onPointerMove = (event: PointerEvent) => {
	const current = interaction.value;
	if (!current) return;

	if (current.kind === "pan") {
		pan.value = { x: current.panX + event.clientX - current.startX, y: current.panY + event.clientY - current.startY };
	} else if (current.kind === "drag") {
		const dx = event.clientX - current.startX;
		const dy = event.clientY - current.startY;
		if (!current.moved && Math.hypot(dx, dy) < CLICK_TOLERANCE) return;
		current.moved = true;
		current.x = current.step.positionX + dx / zoom.value;
		current.y = current.step.positionY + dy / zoom.value;
	} else {
		const { x, y } = toCanvas(event.clientX, event.clientY);
		current.x = x;
		current.y = y;
	}
};

const onPointerUp = (event: PointerEvent) => {
	const current = interaction.value;
	if (current?.kind === "pan") {
		const moved = Math.hypot(event.clientX - current.startX, event.clientY - current.startY) >= CLICK_TOLERANCE;
		if (!moved) {
			selectedEdgeKey.value = undefined;
			emit("select", undefined);
		}
	} else if (current?.kind === "drag") {
		// an editor's click on a tile is a drag that did not move: it opens the settings
		if (current.moved) emit("move", current.step.id, current.x, current.y);
		else {
			selectedEdgeKey.value = undefined;
			emit("select", current.step.id);
		}
	} else if (current?.kind === "connect") {
		const { x, y } = toCanvas(event.clientX, event.clientY);
		const target = stepAt(x, y);
		if (target && target.id !== current.from.id) emit("connect", current.from.id, target.id);
	}
	release();
};

onBeforeUnmount(release);

// --- clicks and keyboard ---

// Pointer clicks of editors are handled when the pointer is released (see onPointerUp), here
// only the keyboard (Enter, Space - a click without detail) selects a tile.
const onTileClick = (event: MouseEvent, step: LearningPathStep) => {
	if (props.isEditor) {
		if (event.detail === 0) emit("select", step.id);
	} else if (step.status === "open" || step.status === "done") {
		emit("open", step);
	}
};

const ARROW_KEYS: Record<string, [number, number]> = {
	ArrowLeft: [-1, 0],
	ArrowRight: [1, 0],
	ArrowUp: [0, -1],
	ArrowDown: [0, 1],
};

// editors move the focused tile with the arrow keys, shift for larger steps
const onTileKeydown = (event: KeyboardEvent, step: LearningPathStep) => {
	const direction = ARROW_KEYS[event.key];
	if (!props.isEditor || !direction) return;
	event.preventDefault();
	const distance = event.shiftKey ? KEYBOARD_STEP * 3 : KEYBOARD_STEP;
	emit("move", step.id, step.positionX + direction[0] * distance, step.positionY + direction[1] * distance);
};

// --- zoom ---

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

// zoom around a point of the viewport, so that point stays where it is
const zoomAt = (factor: number, viewportX: number, viewportY: number) => {
	const next = clampZoom(zoom.value * factor);
	const ratio = next / zoom.value;
	pan.value = { x: viewportX - (viewportX - pan.value.x) * ratio, y: viewportY - (viewportY - pan.value.y) * ratio };
	zoom.value = next;
};

const zoomBy = (factor: number) => {
	const element = viewport.value;
	zoomAt(factor, (element?.clientWidth ?? 0) / 2, (element?.clientHeight ?? 0) / 2);
};

// ctrl + wheel (and pinching on a touchpad) zooms, a plain wheel keeps scrolling the page
const onWheel = (event: WheelEvent) => {
	if (!event.ctrlKey && !event.metaKey) return;
	event.preventDefault();
	const rect = viewport.value?.getBoundingClientRect();
	zoomAt(Math.exp(-event.deltaY / 300), event.clientX - (rect?.left ?? 0), event.clientY - (rect?.top ?? 0));
};

const fitView = () => {
	const element = viewport.value;
	if (!element || props.steps.length === 0 || element.clientWidth === 0) return;

	const padding = 40;
	const xs = props.steps.map((step) => step.positionX);
	const ys = props.steps.map((step) => step.positionY);
	const minX = Math.min(...xs);
	const minY = Math.min(...ys);
	const width = Math.max(...xs) + TILE_WIDTH - minX;
	const height = Math.max(...ys) + TILE_HEIGHT - minY;

	const next = clampZoom(
		Math.min(1, (element.clientWidth - 2 * padding) / width, (element.clientHeight - 2 * padding) / height)
	);
	zoom.value = next;
	pan.value = {
		x: (element.clientWidth - width * next) / 2 - minX * next,
		y: (element.clientHeight - height * next) / 2 - minY * next,
	};
};

// --- boards dragged in from the list next to the canvas ---

const onDragOver = (event: DragEvent) => {
	const types = event.dataTransfer?.types ?? [];
	if (!props.isEditor || !(types.includes(BOARD_DRAG_TYPE) || types.includes(CARD_DRAG_TYPE))) return;
	event.preventDefault();
	if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
	isDropTarget.value = true;
};

const onDrop = (event: DragEvent) => {
	isDropTarget.value = false;
	const boardId = event.dataTransfer?.getData(BOARD_DRAG_TYPE);
	const [cardBoardId, cardId] = (event.dataTransfer?.getData(CARD_DRAG_TYPE) ?? "").split(":");
	if (!props.isEditor || !(boardId || cardId)) return;
	event.preventDefault();
	const { x, y } = toCanvas(event.clientX, event.clientY);
	if (cardId) emit("drop-card", cardBoardId, cardId, x - TILE_WIDTH / 2, y - TILE_HEIGHT / 2);
	else if (boardId) emit("drop-board", boardId, x - TILE_WIDTH / 2, y - TILE_HEIGHT / 2);
};

// a free spot for a board added with the button: right of the right-most tile in the top row
const freePosition = (): { x: number; y: number } => {
	if (props.steps.length === 0) return { x: 0, y: 0 };
	const maxX = Math.max(...props.steps.map((step) => step.positionX));
	const minY = Math.min(...props.steps.map((step) => step.positionY));
	return { x: maxX + TILE_WIDTH + 80, y: minY };
};

defineExpose({ fitView, freePosition });
</script>

<style scoped>
.lp-canvas {
	position: relative;
	height: 65vh;
	min-height: 360px;
	overflow: hidden;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
	border-radius: 4px;
	cursor: grab;
	touch-action: none;
	background-color: rgba(var(--v-theme-on-surface), 0.02);
	background-image: radial-gradient(rgba(var(--v-theme-on-surface), 0.12) 1px, transparent 1px);
	background-size: 20px 20px;
}

.lp-canvas--panning {
	cursor: grabbing;
}

.lp-canvas--drop {
	outline: 2px dashed rgb(var(--v-theme-primary));
	outline-offset: -4px;
}

.lp-canvas__stage {
	position: absolute;
	top: 0;
	left: 0;
	transform-origin: 0 0;
}

.lp-canvas__edges {
	position: absolute;
	overflow: visible;
	pointer-events: none;
}

.lp-canvas__edge {
	fill: none;
	stroke: rgba(var(--v-theme-on-surface), 0.45);
	stroke-width: 2;
}

.lp-canvas__edge--active {
	stroke: rgb(var(--v-theme-primary));
	stroke-width: 3;
}

.lp-canvas__edge--locked,
.lp-canvas__edge--draft {
	stroke-dasharray: 6 5;
}

.lp-canvas__arrow-head {
	fill: rgba(var(--v-theme-on-surface), 0.6);
}

.lp-canvas__controls {
	position: absolute;
	right: 8px;
	bottom: 8px;
	display: flex;
	border-radius: 4px;
	background: rgb(var(--v-theme-surface));
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
	cursor: default;
}

/* the wide, invisible line an editor clicks to select an arrow */
.lp-canvas__edge-hit {
	fill: none;
	stroke: transparent;
	stroke-width: 16;
	pointer-events: stroke;
	cursor: pointer;
}

.lp-canvas__edge--selected {
	stroke: rgb(var(--v-theme-error));
	stroke-width: 3;
}

.lp-canvas__edge-remove {
	position: absolute;
	transform: translate(-50%, -50%);
	z-index: 2;
}

.lp-canvas:focus {
	outline: none;
}
</style>
