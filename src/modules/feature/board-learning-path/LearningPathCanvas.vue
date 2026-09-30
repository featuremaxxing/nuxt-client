<template>
	<div
		ref="viewport"
		class="lp-canvas"
		:class="{ 'lp-canvas--panning': interaction?.kind === 'pan', 'lp-canvas--drop': isDropTarget }"
		data-testid="learning-path-canvas"
		@pointerdown="onBackgroundPointerDown"
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
					:class="{ 'lp-canvas__edge--active': edge.isActive, 'lp-canvas__edge--locked': edge.isLocked }"
					:marker-end="`url(#${markerId})`"
					data-testid="learning-path-edge"
				/>
				<path
					v-if="draftEdge"
					:d="draftEdge"
					class="lp-canvas__edge lp-canvas__edge--draft"
					:marker-end="`url(#${markerId})`"
				/>
			</svg>
			<LearningPathTile
				v-for="step in steps"
				:key="step.id"
				:step="step"
				:is-editor="isEditor"
				:is-selected="step.id === selectedStepId"
				:hint="hints[step.id]"
				:style="tileStyle(step)"
				@pointerdown.stop="onTilePointerDown($event, step)"
				@click="onTileClick(step)"
				@keydown="onTileKeydown($event, step)"
				@handle-pointerdown="onHandlePointerDown($event, step)"
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
import { BOARD_DRAG_TYPE, TILE_HEIGHT, TILE_WIDTH } from "./canvas";
import LearningPathTile from "./LearningPathTile.vue";
import { edgesOf, type LearningPathStep } from "@data-board-learning-path";
import { mdiFitToScreenOutline, mdiMagnifyMinusOutline, mdiMagnifyPlusOutline } from "@icons/material";
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
	selectedStepId: { type: String, default: undefined },
	hints: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
});

const emit = defineEmits<{
	(e: "select", stepId: string | undefined): void;
	(e: "open", step: LearningPathStep): void;
	(e: "move", stepId: string, positionX: number, positionY: number): void;
	(e: "connect", fromId: string, toId: string): void;
	(e: "drop-board", boardId: string, positionX: number, positionY: number): void;
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
	| { kind: "connect"; from: LearningPathStep; x: number; y: number };

const interaction = ref<Interaction>();
// the click that ends a drag must not also select or open the tile
let suppressNextClick = false;

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

const curve = (x1: number, y1: number, x2: number, y2: number): string => {
	const bend = Math.max(40, Math.abs(x2 - x1) / 2);
	return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
};

const edgePaths = computed(() => {
	const byId = new Map(props.steps.map((step) => [step.id, step]));

	return edgesOf(props.steps).map(({ fromId, toId }) => {
		const from = positionOf(byId.get(fromId) as LearningPathStep);
		const to = byId.get(toId) as LearningPathStep;
		const toPosition = positionOf(to);
		return {
			key: `${fromId}-${toId}`,
			d: curve(from.x + TILE_WIDTH, from.y + TILE_HEIGHT / 2, toPosition.x, toPosition.y + TILE_HEIGHT / 2),
			isActive: props.selectedStepId === toId || props.selectedStepId === fromId,
			isLocked: !props.isEditor && to.status === "locked",
		};
	});
});

const draftEdge = computed(() => {
	const current = interaction.value;
	if (current?.kind !== "connect") return undefined;
	const from = positionOf(current.from);
	return curve(from.x + TILE_WIDTH, from.y + TILE_HEIGHT / 2, current.x, current.y);
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

const capture = (event: PointerEvent) => {
	viewport.value?.setPointerCapture?.(event.pointerId);
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
	capture(event);
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
	capture(event);
};

const onHandlePointerDown = (event: PointerEvent, step: LearningPathStep) => {
	const { x, y } = toCanvas(event.clientX, event.clientY);
	interaction.value = { kind: "connect", from: step, x, y };
	capture(event);
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
		if (!moved) emit("select", undefined);
	} else if (current?.kind === "drag" && current.moved) {
		suppressNextClick = true;
		emit("move", current.step.id, current.x, current.y);
	} else if (current?.kind === "connect") {
		const { x, y } = toCanvas(event.clientX, event.clientY);
		const target = stepAt(x, y);
		if (target && target.id !== current.from.id) emit("connect", current.from.id, target.id);
	}
	release();
};

onBeforeUnmount(release);

// --- clicks and keyboard ---

const onTileClick = (step: LearningPathStep) => {
	if (suppressNextClick) {
		suppressNextClick = false;
		return;
	}
	if (props.isEditor) {
		emit("select", step.id);
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
	if (!props.isEditor || !event.dataTransfer?.types.includes(BOARD_DRAG_TYPE)) return;
	event.preventDefault();
	event.dataTransfer.dropEffect = "copy";
	isDropTarget.value = true;
};

const onDrop = (event: DragEvent) => {
	isDropTarget.value = false;
	const boardId = event.dataTransfer?.getData(BOARD_DRAG_TYPE);
	if (!props.isEditor || !boardId) return;
	event.preventDefault();
	const { x, y } = toCanvas(event.clientX, event.clientY);
	emit("drop-board", boardId, x - TILE_WIDTH / 2, y - TILE_HEIGHT / 2);
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
</style>
