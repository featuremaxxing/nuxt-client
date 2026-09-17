<template>
	<VDialog
		:model-value="isOpen"
		fullscreen
		scrollable
		data-testid="assignment-pdf-annotator"
		@update:model-value="(value: boolean) => !value && emit('cancel')"
	>
		<VCard>
			<VToolbar density="compact" color="var(--color-secondary)" data-testid="annotator-toolbar">
				<VToolbarTitle class="text-body-2 text-truncate">
					{{ source?.name }}
				</VToolbarTitle>
				<VSpacer />
				<template v-if="!loading">
					<VBtn
						v-for="color in PEN_COLORS"
						:key="color.value"
						:icon="mdiPencil"
						:color="color.value"
						:variant="!isEraser && selectedColor === color.value ? 'flat' : 'text'"
						size="small"
						:aria-label="t(color.label)"
						:data-testid="`annotator-color-${color.value.slice(1)}`"
						@click="selectPen(color.value)"
					/>
					<VBtn
						:icon="mdiPen"
						:variant="!isEraser && selectedWidth === THIN_WIDTH ? 'tonal' : 'text'"
						size="small"
						class="ml-1"
						:aria-label="t('components.cardElement.assignmentElement.annotator.widthThin')"
						data-testid="annotator-width-thin"
						@click="selectWidth(THIN_WIDTH)"
					/>
					<VBtn
						:icon="mdiBrush"
						:variant="!isEraser && selectedWidth === WIDE_WIDTH ? 'tonal' : 'text'"
						size="small"
						:aria-label="t('components.cardElement.assignmentElement.annotator.widthThick')"
						data-testid="annotator-width-thick"
						@click="selectWidth(WIDE_WIDTH)"
					/>
					<VBtn
						:icon="mdiEraser"
						:variant="isEraser ? 'tonal' : 'text'"
						size="small"
						:aria-label="t('components.cardElement.assignmentElement.annotator.eraser')"
						data-testid="annotator-eraser"
						@click="toggleEraser"
					/>
					<VBtn
						:icon="mdiUndo"
						:disabled="model.isEmpty()"
						variant="text"
						size="small"
						:aria-label="t('components.cardElement.assignmentElement.annotator.undo')"
						data-testid="annotator-undo"
						@click="undo"
					/>
					<template v-if="numPages > 1">
						<VBtn
							:icon="mdiChevronLeft"
							variant="text"
							size="small"
							:disabled="currentPage <= 1"
							:aria-label="t('common.labels.previousPage')"
							data-testid="annotator-page-prev"
							@click="showPage(currentPage - 1)"
						/>
						<span class="text-caption" data-testid="annotator-page-indicator">
							{{ t("components.cardElement.assignmentElement.annotator.page", { current: currentPage, total: numPages }) }}
						</span>
						<VBtn
							:icon="mdiChevronRight"
							variant="text"
							size="small"
							:disabled="currentPage >= numPages"
							:aria-label="t('common.labels.nextPage')"
							data-testid="annotator-page-next"
							@click="showPage(currentPage + 1)"
						/>
					</template>
				</template>
				<VSpacer />
				<VBtn variant="text" data-testid="annotator-cancel" @click="emit('cancel')">
					{{ t("common.actions.cancel") }}
				</VBtn>
				<VBtn
					variant="tonal"
					:loading="saving"
					:disabled="loading"
					data-testid="annotator-save"
					@click="save"
				>
					{{ t("common.actions.save") }}
				</VBtn>
			</VToolbar>

			<VCardText class="annotator-stage d-flex align-center justify-center">
				<VAlert
					v-if="errorMessage"
					type="error"
					variant="tonal"
					density="compact"
					class="annotator-error"
					data-testid="annotator-error"
				>
					{{ errorMessage }}
				</VAlert>
				<div v-if="loading" class="text-caption">{{ t("common.labels.loading") }}</div>
				<div v-show="!loading" ref="stageRef" class="annotator-canvas-stack">
					<canvas ref="baseCanvasRef" class="annotator-canvas" />
					<canvas
						ref="inkCanvasRef"
						class="annotator-canvas annotator-ink"
						data-testid="annotator-ink-canvas"
						@pointerdown="onPointerDown"
						@pointermove="onPointerMove"
						@pointerup="onPointerUp"
						@pointercancel="onPointerUp"
					/>
				</div>
			</VCardText>
		</VCard>
	</VDialog>
</template>

<script lang="ts">
export interface AnnotatorSource {
	kind: "pdf" | "image";
	url: string;
	name: string;
}
</script>

<script setup lang="ts">
import {
	drawStrokesOnCanvas,
	StrokeModel,
	type Stroke,
	type StrokePoint,
} from "@/utils/pdf-annotation";
import { loadPdf, MAX_RENDER_DIMENSION, renderPdfPageToCanvas } from "@/utils/pdf-renderer";
import {
	mdiBrush,
	mdiChevronLeft,
	mdiChevronRight,
	mdiEraser,
	mdiPencil,
	mdiPen,
	mdiUndo,
} from "@icons/material";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Fullscreen editor for annotating a student's submitted PDF or image with a pen
// (Apple Pencil, finger or mouse all arrive as pointer events). Strokes are kept
// per page in normalized coordinates and baked into a new file on save, which is
// uploaded as a teacher feedback file and released to the student on return.

const props = defineProps<{
	isOpen: boolean;
	source: AnnotatorSource | undefined;
	errorMessage?: string;
}>();

const emit = defineEmits<{
	(e: "cancel"): void;
	(e: "save", payload: { blob: Blob; name: string }): void;
}>();

const { t } = useI18n();

const PEN_COLORS = [
	{ value: "#000000", label: "components.cardElement.assignmentElement.annotator.colorBlack" },
	{ value: "#e53935", label: "components.cardElement.assignmentElement.annotator.colorRed" },
	{ value: "#1e88e5", label: "components.cardElement.assignmentElement.annotator.colorBlue" },
	{ value: "#43a047", label: "components.cardElement.assignmentElement.annotator.colorGreen" },
] as const;

const THIN_WIDTH = 0.0025;
const WIDE_WIDTH = 0.007;
const ERASE_RADIUS = 0.012;

const model = new StrokeModel();
const baseCanvasRef = ref<HTMLCanvasElement | undefined>(undefined);
const inkCanvasRef = ref<HTMLCanvasElement | undefined>(undefined);

const loading = ref(false);
const saving = ref(false);
const selectedColor = ref<string>(PEN_COLORS[0].value);
const selectedWidth = ref<number>(THIN_WIDTH);
const isEraser = ref(false);
const currentPage = ref(1);
const numPages = ref(1);

let pdfBytes: ArrayBuffer | undefined;
let pdfDoc: Awaited<ReturnType<typeof loadPdf>> | undefined;

const selectPen = (color: string) => {
	isEraser.value = false;
	selectedColor.value = color;
	selectedWidth.value = THIN_WIDTH;
};

const selectWidth = (width: number) => {
	isEraser.value = false;
	selectedWidth.value = width;
};

const toggleEraser = () => {
	isEraser.value = !isEraser.value;
};

watch(
	() => [props.isOpen, props.source] as const,
	([isOpen, source]) => {
		if (isOpen && source) {
			void init();
		}
	},
	{ immediate: true }
);

const init = async () => {
	if (!props.source) return;

	loading.value = true;
	saving.value = false;
	numPages.value = 1;
	currentPage.value = 1;

	try {
		const response = await fetch(props.source.url);
		if (props.source.kind === "pdf") {
			pdfBytes = await response.arrayBuffer();
			pdfDoc = await loadPdf(pdfBytes.slice(0));
			numPages.value = pdfDoc.numPages;
			await renderPage(1);
		} else {
			await renderImage();
		}
	} catch {
		// loading failed (e.g. broken file record) - the empty stage plus the
		// cancel button keep the dialog escapable
	} finally {
		loading.value = false;
	}
};

const renderPage = async (pageNumber: number) => {
	if (!pdfDoc) return;

	currentPage.value = pageNumber;
	const base = baseCanvasRef.value;
	const ink = inkCanvasRef.value;
	if (!base || !ink) return;

	await renderPdfPageToCanvas(pdfDoc, pageNumber, base);
	syncInkCanvasSize(base, ink);
	redrawInk();
};

const renderImage = async () => {
	const base = baseCanvasRef.value;
	const ink = inkCanvasRef.value;
	if (!base || !ink || !props.source) return;

	const image = new Image();
	image.src = props.source.url;
	await image.decode();

	const dpr = window.devicePixelRatio || 1;
	const scale = Math.min(
		MAX_RENDER_DIMENSION / image.naturalWidth,
		MAX_RENDER_DIMENSION / image.naturalHeight,
		2 * dpr
	);
	base.width = Math.floor(image.naturalWidth * scale);
	base.height = Math.floor(image.naturalHeight * scale);
	base.getContext("2d")?.drawImage(image, 0, 0, base.width, base.height);

	syncInkCanvasSize(base, ink);
	redrawInk();
};

const syncInkCanvasSize = (base: HTMLCanvasElement, ink: HTMLCanvasElement) => {
	ink.width = base.width;
	ink.height = base.height;
};

const redrawInk = () => {
	const ink = inkCanvasRef.value;
	if (!ink) return;
	const ctx = ink.getContext("2d");
	if (!ctx) return;

	drawStrokesOnCanvas(ctx, model.strokesForPage(currentPage.value - 1), ink.width, ink.height);
	drawCurrentStroke(ctx, ink);
};

const drawCurrentStroke = (ctx: CanvasRenderingContext2D, ink: HTMLCanvasElement) => {
	if (!currentStroke || currentStroke.points.length === 0) return;

	drawStrokesOnCanvas(ctx, [currentStroke], ink.width, ink.height);
};

let currentStroke: Stroke | undefined;
let isErasing = false;

const toCanvasPoint = (event: PointerEvent): StrokePoint => {
	const ink = inkCanvasRef.value!;
	const rect = ink.getBoundingClientRect();

	return {
		x: (event.clientX - rect.left) / rect.width,
		y: (event.clientY - rect.top) / rect.height,
	};
};

const onPointerDown = (event: PointerEvent) => {
	if (loading.value || saving.value) return;

	event.preventDefault();
	inkCanvasRef.value?.setPointerCapture(event.pointerId);
	const point = toCanvasPoint(event);

	if (isEraser.value) {
		isErasing = true;
		eraseAtPoint(point);

		return;
	}

	currentStroke = {
		pageIndex: currentPage.value - 1,
		color: selectedColor.value,
		widthFactor: selectedWidth.value,
		points: [point],
	};
};

const onPointerMove = (event: PointerEvent) => {
	if (isErasing) {
		eraseAtPoint(toCanvasPoint(event));

		return;
	}

	if (!currentStroke) return;

	event.preventDefault();
	currentStroke.points.push(toCanvasPoint(event));
	redrawInk();
};

const onPointerUp = () => {
	if (isErasing) {
		isErasing = false;

		return;
	}

	if (currentStroke) {
		model.addStroke(currentStroke);
		currentStroke = undefined;
		redrawInk();
	}
};

const eraseAtPoint = (point: StrokePoint) => {
	model.eraseAt(currentPage.value - 1, point, ERASE_RADIUS);
	redrawInk();
};

const undo = () => {
	const removed = model.getAll()[model.getAll().length - 1];
	model.undo();

	if (removed && removed.pageIndex !== currentPage.value - 1 && removed.pageIndex < numPages.value) {
		// jump to the page the undone stroke lived on so the effect is visible
		void renderPage(removed.pageIndex + 1);

		return;
	}

	redrawInk();
};

const showPage = async (pageNumber: number) => {
	await renderPage(pageNumber);
};

const save = async () => {
	if (!props.source || loading.value) return;

	saving.value = true;
	try {
		if (props.source.kind === "pdf" && pdfBytes) {
			const blob = await import("@/utils/pdf-annotation").then((module) =>
				module.flattenStrokesIntoPdf(pdfBytes as ArrayBuffer, model.getAll())
			);
			emit("save", { blob, name: `feedback-pdf-${Date.now()}.pdf` });

			return;
		}

		const base = baseCanvasRef.value;
		if (base) {
			const { flattenStrokesIntoImage } = await import("@/utils/pdf-annotation");
			const blob = await flattenStrokesIntoImage(base, model.strokesForPage(currentPage.value - 1));
			emit("save", { blob, name: `feedback-img-${Date.now()}.png` });
		}
	} finally {
		saving.value = false;
	}
};
</script>

<style scoped>
.annotator-stage {
	min-height: 0;
	overflow: auto;
	gap: 12px;
	flex-direction: column;
}

.annotator-error {
	max-width: 640px;
}

.annotator-canvas-stack {
	position: relative;
	max-width: 100%;
	max-height: 100%;
	display: inline-flex;
}

.annotator-canvas {
	display: block;
	max-width: 100%;
	max-height: calc(100vh - 48px);
	width: auto;
	height: auto;
	background: #ffffff;
	box-shadow: 0 1px 4px rgb(0 0 0 / 20%);
}

.annotator-ink {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	touch-action: none;
	cursor: crosshair;
	background: transparent;
	box-shadow: none;
}
</style>
