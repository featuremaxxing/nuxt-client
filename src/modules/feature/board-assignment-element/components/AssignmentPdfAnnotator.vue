<template>
	<VDialog
		:model-value="isOpen"
		fullscreen
		scrollable
		:z-index="3000"
		data-testid="assignment-pdf-annotator"
		@update:model-value="(value: boolean) => !value && emit('cancel')"
	>
		<VCard class="annotator-card">
			<VToolbar density="compact" color="var(--color-secondary)" data-testid="annotator-toolbar">
				<VToolbarTitle class="text-body-2 text-truncate">
					<span v-if="studentName" data-testid="annotator-student-name">{{ studentName }}&nbsp;–&nbsp;</span>
					<span>{{ source?.name }}</span>
				</VToolbarTitle>
				<VSpacer />
				<template v-if="!loading">
					<VBtn
						v-for="color in PEN_COLORS"
						:key="color.value"
						:icon="mdiPencil"
						:color="color.value"
						:variant="activeTool === 'pen' && selectedColor === color.value ? 'flat' : 'text'"
						size="small"
						:aria-label="t(color.label)"
						:data-testid="`annotator-color-${color.value.slice(1)}`"
						@click="selectPen(color.value)"
					/>
					<VBtn
						:icon="mdiPen"
						:variant="activeTool === 'pen' && selectedWidth === THIN_WIDTH ? 'tonal' : 'text'"
						size="small"
						class="ml-1"
						:aria-label="t('components.cardElement.assignmentElement.annotator.widthThin')"
						data-testid="annotator-width-thin"
						@click="selectWidth(THIN_WIDTH)"
					/>
					<VBtn
						:icon="mdiBrush"
						:variant="activeTool === 'pen' && selectedWidth === WIDE_WIDTH ? 'tonal' : 'text'"
						size="small"
						:aria-label="t('components.cardElement.assignmentElement.annotator.widthThick')"
						data-testid="annotator-width-thick"
						@click="selectWidth(WIDE_WIDTH)"
					/>
					<VBtn
						:icon="mdiEraser"
						:variant="activeTool === 'eraser' ? 'tonal' : 'text'"
						size="small"
						:aria-label="t('components.cardElement.assignmentElement.annotator.eraser')"
						data-testid="annotator-eraser"
						@click="selectTool('eraser')"
					/>
					<VBtn
						v-if="isPdf"
						:icon="mdiCommentTextOutline"
						:variant="activeTool === 'comment' ? 'tonal' : 'text'"
						size="small"
						class="ml-1"
						:aria-label="t('components.cardElement.assignmentElement.annotator.comment')"
						data-testid="annotator-comment-tool"
						@click="selectTool('comment')"
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
					<VBtn
						:icon="mdiHandBackRight"
						:variant="fingerDraws ? 'tonal' : 'text'"
						size="small"
						class="ml-1"
						:aria-label="
							t(
								fingerDraws
									? 'components.cardElement.assignmentElement.annotator.fingerDraws'
									: 'components.cardElement.assignmentElement.annotator.fingerNavigates'
							)
						"
						data-testid="annotator-finger-mode"
						@click="fingerDraws = !fingerDraws"
					/>
					<VBtn
						:icon="mdiFitToPageOutline"
						variant="text"
						size="small"
						:aria-label="t('components.cardElement.assignmentElement.annotator.fitToPage')"
						data-testid="annotator-fit-to-page"
						@click="fitToPage"
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
							{{
								t("components.cardElement.assignmentElement.annotator.page", { current: currentPage, total: numPages })
							}}
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
				<VBtn variant="tonal" :loading="saving" :disabled="loading" data-testid="annotator-save" @click="save">
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
				<div ref="stageRef" class="annotator-viewport" @wheel="onWheel">
					<div class="annotator-canvas-stack" :style="stackStyle">
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
						<div
							v-if="isPdf"
							ref="commentLayerRef"
							class="annotator-comment-layer"
							:class="{ 'annotator-comment-layer--active': activeTool === 'comment' }"
							data-testid="annotator-comment-layer"
							@click="onCommentLayerClick"
						>
							<button
								v-for="comment in commentsOnPage"
								:key="comment.id"
								type="button"
								class="annotator-comment-marker"
								:style="{ left: `${comment.x * 100}%`, top: `${comment.y * 100}%` }"
								:aria-label="t('components.cardElement.assignmentElement.annotator.comment')"
								:data-testid="`annotator-comment-marker-${comment.id}`"
								@click.stop="openComment(comment.id)"
							>
								<VIcon :icon="mdiCommentTextOutline" size="small" />
							</button>

							<div
								v-if="activeComment"
								class="annotator-comment-popup"
								:style="{ left: `${activeComment.x * 100}%`, top: `${activeComment.y * 100}%` }"
								data-testid="annotator-comment-popup"
								@click.stop
							>
								<VTextarea
									v-model="commentDraftText"
									autofocus
									rows="2"
									auto-grow
									density="compact"
									hide-details
									:placeholder="t('components.cardElement.assignmentElement.annotator.commentPlaceholder')"
									data-testid="annotator-comment-input"
								/>
								<div class="d-flex justify-end ga-1 mt-1">
									<VBtn size="small" variant="text" data-testid="annotator-comment-delete" @click="deleteOpenComment">
										{{ t("common.actions.delete") }}
									</VBtn>
									<VBtn size="small" variant="tonal" data-testid="annotator-comment-done" @click="closeCommentPopup">
										{{ t("components.cardElement.assignmentElement.annotator.commentDone") }}
									</VBtn>
								</div>
							</div>
						</div>
					</div>
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
	type PdfComment,
	readPdfComments,
	type Stroke,
	StrokeModel,
	type StrokePoint,
} from "@/utils/pdf-annotation";
import { loadPdf, MAX_RENDER_DIMENSION, renderPdfPageToCanvas } from "@/utils/pdf-renderer";
import {
	mdiBrush,
	mdiChevronLeft,
	mdiChevronRight,
	mdiCommentTextOutline,
	mdiEraser,
	mdiFitToPageOutline,
	mdiHandBackRight,
	mdiPen,
	mdiPencil,
	mdiUndo,
} from "@icons/material";
import { useElementSize } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Fullscreen editor for annotating a student's submitted PDF or image with a pen
// (Apple Pencil, finger or mouse all arrive as pointer events). Strokes are kept
// per page in normalized coordinates and baked into a new file on save, which is
// uploaded as a teacher feedback file and released to the student on return.

const props = defineProps<{
	isOpen: boolean;
	source: AnnotatorSource | undefined;
	errorMessage?: string;
	studentName?: string;
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
const stageRef = ref<HTMLElement | undefined>(undefined);

const loading = ref(false);
const saving = ref(false);
const selectedColor = ref<string>(PEN_COLORS[0].value);
const selectedWidth = ref<number>(THIN_WIDTH);
// three-way tool state (was a plain isEraser boolean) - the comment tool needs its
// own state alongside pen/eraser, and a single field rules out a pen+eraser-at-once state
const activeTool = ref<"pen" | "eraser" | "comment">("pen");
const currentPage = ref(1);
const numPages = ref(1);

let pdfBytes: ArrayBuffer | undefined;
let pdfDoc: Awaited<ReturnType<typeof loadPdf>> | undefined;

const isPdf = computed(() => props.source?.kind === "pdf");

// --- pinch-zoom / pan ------------------------------------------------------------
// The page is rendered at a fixed backing-store size (pageSize, in canvas px) and
// displayed through a CSS transform on the stack, rather than being reflowed by CSS
// max-width/max-height. That keeps the base canvas and the ink canvas on top of it
// in lockstep in every viewport shape - the old CSS-only sizing let them diverge in
// portrait, which is what corrupted the annotation alignment there.
const { width: stageWidth, height: stageHeight } = useElementSize(stageRef);
const pageSize = ref({ width: 0, height: 0 });
const scale = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
const fitScale = ref(1);
const hasUserZoomed = ref(false);
// Finger navigates by default; a pencil sighting flips this automatically so a
// resting palm can never be mistaken for intentional touch input (see onPointerDown).
const fingerDraws = ref(false);

const MAX_SCALE_FACTOR = 6;

const stackStyle = computed(() => ({
	width: `${pageSize.value.width}px`,
	height: `${pageSize.value.height}px`,
	transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
	"--annotator-inverse-scale": String(scale.value > 0 ? 1 / scale.value : 1),
}));

const computeFitScale = (): number => {
	const pageWidth = pageSize.value.width;
	const pageHeight = pageSize.value.height;
	if (!pageWidth || !pageHeight || !stageWidth.value || !stageHeight.value) {
		return fitScale.value || 1;
	}

	return Math.min(stageWidth.value / pageWidth, stageHeight.value / pageHeight);
};

const clampScale = (value: number): number =>
	Math.min(fitScale.value * MAX_SCALE_FACTOR, Math.max(fitScale.value, value));

const clampOffset = (): void => {
	const displayedWidth = pageSize.value.width * scale.value;
	const displayedHeight = pageSize.value.height * scale.value;

	const minX = Math.min(0, stageWidth.value - displayedWidth);
	const maxX = Math.max(0, stageWidth.value - displayedWidth);
	offsetX.value = Math.min(maxX, Math.max(minX, offsetX.value));

	const minY = Math.min(0, stageHeight.value - displayedHeight);
	const maxY = Math.max(0, stageHeight.value - displayedHeight);
	offsetY.value = Math.min(maxY, Math.max(minY, offsetY.value));
};

// Recomputes the reference fit scale and either re-centers the page (nothing user-driven
// happened yet) or keeps the user's own zoom/pan, just clamped back into view - used for
// both an orientation change and a page switch, so a rotation never resets a deliberate zoom.
const applyLayout = (): void => {
	fitScale.value = computeFitScale();

	if (hasUserZoomed.value) {
		scale.value = clampScale(scale.value);
		clampOffset();

		return;
	}

	scale.value = fitScale.value;
	offsetX.value = (stageWidth.value - pageSize.value.width * fitScale.value) / 2;
	offsetY.value = (stageHeight.value - pageSize.value.height * fitScale.value) / 2;
};

const fitToPage = (): void => {
	hasUserZoomed.value = false;
	applyLayout();
};

watch([stageWidth, stageHeight], () => applyLayout());

const stageClientOrigin = (): { x: number; y: number } => {
	const rect = stageRef.value?.getBoundingClientRect();

	return { x: rect?.left ?? 0, y: rect?.top ?? 0 };
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } => ({
	x: (a.x + b.x) / 2,
	y: (a.y + b.y) / 2,
});

const onWheel = (event: WheelEvent): void => {
	// a bare wheel is normal trackpad scrolling; only ctrl+wheel is the browser's
	// spelling for a trackpad pinch gesture
	if (!event.ctrlKey) return;

	event.preventDefault();
	const origin = stageClientOrigin();
	const local = { x: event.clientX - origin.x, y: event.clientY - origin.y };
	const anchorPage = { x: (local.x - offsetX.value) / scale.value, y: (local.y - offsetY.value) / scale.value };
	const nextScale = clampScale(scale.value * Math.exp(-event.deltaY * 0.01));

	scale.value = nextScale;
	offsetX.value = local.x - anchorPage.x * nextScale;
	offsetY.value = local.y - anchorPage.y * nextScale;
	hasUserZoomed.value = true;
	clampOffset();
};

const selectPen = (color: string) => {
	activeTool.value = "pen";
	selectedColor.value = color;
	selectedWidth.value = THIN_WIDTH;
};

const selectWidth = (width: number) => {
	activeTool.value = "pen";
	selectedWidth.value = width;
};

const selectTool = (tool: "eraser" | "comment") => {
	activeTool.value = activeTool.value === tool ? "pen" : tool;
};

const init = async () => {
	if (!props.source) return;

	loading.value = true;
	saving.value = false;
	numPages.value = 1;
	currentPage.value = 1;
	activeTool.value = "pen";
	comments.value = [];
	activeCommentId.value = undefined;
	hasUserZoomed.value = false;
	fingerDraws.value = false;
	// a selection carried in from the page behind the dialog keeps iOS in its
	// selection-handling mode, where the first touches go to dismissing it rather than
	// to the canvas - drop it so the editor starts in a clean state
	window.getSelection()?.removeAllRanges();

	try {
		const response = await fetch(props.source.url);
		if (props.source.kind === "pdf") {
			pdfBytes = await response.arrayBuffer();
			pdfDoc = await loadPdf(pdfBytes.slice(0));
			numPages.value = pdfDoc.numPages;
			// comments already left in an earlier correction round are loaded into the
			// same editable model, so re-saving without touching them carries them over
			comments.value = await readPdfComments(pdfDoc);
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

	// an open popup belongs to a marker on the page being left
	if (activeCommentId.value) {
		closeCommentPopup();
	}
	currentPage.value = pageNumber;
	const base = baseCanvasRef.value;
	const ink = inkCanvasRef.value;
	if (!base || !ink) return;

	await renderPdfPageToCanvas(pdfDoc, pageNumber, base);
	syncInkCanvasSize(base, ink);
	pageSize.value = { width: base.width, height: base.height };
	applyLayout();
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
	const renderScale = Math.min(
		MAX_RENDER_DIMENSION / image.naturalWidth,
		MAX_RENDER_DIMENSION / image.naturalHeight,
		2 * dpr
	);
	base.width = Math.floor(image.naturalWidth * renderScale);
	base.height = Math.floor(image.naturalHeight * renderScale);
	base.getContext("2d")?.drawImage(image, 0, 0, base.width, base.height);

	syncInkCanvasSize(base, ink);
	pageSize.value = { width: base.width, height: base.height };
	applyLayout();
	redrawInk();
};

const syncInkCanvasSize = (base: HTMLCanvasElement, ink: HTMLCanvasElement) => {
	ink.width = base.width;
	ink.height = base.height;
};

// draws the finished strokes and the in-progress one in a single pass - drawStrokesOnCanvas
// clears the canvas on every call, so calling it twice (once per stroke set) wiped out the
// finished strokes for as long as a stroke was in progress, which read as "flickering ink"
const redrawInk = () => {
	const ink = inkCanvasRef.value;
	if (!ink) return;
	const ctx = ink.getContext("2d");
	if (!ctx) return;

	const strokes = model.strokesForPage(currentPage.value - 1);
	const visible = currentStroke && currentStroke.points.length > 0 ? [...strokes, currentStroke] : strokes;
	drawStrokesOnCanvas(ctx, visible, ink.width, ink.height);
};

let currentStroke: Stroke | undefined;
let isErasing = false;
// Which pointer currently owns currentStroke/isErasing - onPointerDown always overwrites it
// unconditionally (self-healing if a previous pointerup was ever missed), and
// onPointerMove/onPointerUp ignore any event whose pointerId doesn't match. Apple Pencil hands
// out a new pointerId per contact, so writing quickly hands two overlapping ids to the browser
// in close succession; without this check a late pointerup for the just-finished stroke could
// arrive after the next stroke's pointerdown and prematurely commit/clear it, silently dropping
// every following pointermove of the still-active new stroke.
let activeDrawingPointerId: number | undefined;

const toCanvasPoint = (event: PointerEvent): StrokePoint => {
	const ink = inkCanvasRef.value!;
	const rect = ink.getBoundingClientRect();

	return {
		x: (event.clientX - rect.left) / rect.width,
		y: (event.clientY - rect.top) / rect.height,
	};
};

// --- navigation (pan/pinch) pointer bookkeeping -----------------------------------
// Only touch pointers ever navigate - pen and mouse always draw (see isNavigationPointer).
const activePointers = new Map<number, { x: number; y: number }>();
let pencilPointerId: number | undefined;
let isPanning = false;
let panStartClient = { x: 0, y: 0 };
let panStartOffset = { x: 0, y: 0 };
let pinchStartDistance = 0;
let pinchStartScale = 1;
let pinchStartOrigin = { x: 0, y: 0 };
let pinchAnchorPage = { x: 0, y: 0 };

const isNavigationPointer = (event: PointerEvent): boolean => event.pointerType === "touch" && !fingerDraws.value;

// A touch pointer that never became a tracked navigation pointer (e.g. a palm ignored at
// pointerdown because a pencil was already down) must never reach the drawing state machine
// below either - without this, that pointer's own pointerup fell through into "finish the
// current stroke" and committed the pencil's in-progress stroke early, on the palm lifting
// rather than the pencil. Once currentStroke was cleared that way, the pencil's own further
// pointermove events (it never got a pointerup) had nothing to append to and were dropped,
// which read as "the next stroke doesn't come" even though the pencil was still down.
const isDrawingPointer = (event: PointerEvent): boolean => event.pointerType !== "touch" || fingerDraws.value;

const beginNavigationPointer = (event: PointerEvent): void => {
	activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

	if (activePointers.size === 1) {
		isPanning = true;
		panStartClient = { x: event.clientX, y: event.clientY };
		panStartOffset = { x: offsetX.value, y: offsetY.value };

		return;
	}

	if (activePointers.size === 2) {
		isPanning = false;
		// a lone stroke must not survive a second finger landing on the page - without
		// this the stroke silently kept whatever the first finger had drawn so far
		currentStroke = undefined;
		redrawInk();

		const [a, b] = [...activePointers.values()];
		pinchStartDistance = distance(a, b) || 1;
		pinchStartScale = scale.value;
		pinchStartOrigin = stageClientOrigin();
		const mid = midpoint(a, b);
		const midLocal = { x: mid.x - pinchStartOrigin.x, y: mid.y - pinchStartOrigin.y };
		// the page point currently under the pinch midpoint stays under the fingers for
		// the whole gesture, instead of drifting as scale/offset are re-derived per move
		pinchAnchorPage = {
			x: (midLocal.x - offsetX.value) / scale.value,
			y: (midLocal.y - offsetY.value) / scale.value,
		};
	}
};

const updateNavigationPointer = (event: PointerEvent): void => {
	activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

	if (activePointers.size >= 2) {
		if (pinchStartDistance === 0) return;

		const [a, b] = [...activePointers.values()];
		const dist = distance(a, b);
		const mid = midpoint(a, b);
		const midLocal = { x: mid.x - pinchStartOrigin.x, y: mid.y - pinchStartOrigin.y };
		const nextScale = clampScale(pinchStartScale * (dist / pinchStartDistance));

		scale.value = nextScale;
		offsetX.value = midLocal.x - pinchAnchorPage.x * nextScale;
		offsetY.value = midLocal.y - pinchAnchorPage.y * nextScale;
		hasUserZoomed.value = true;
		clampOffset();

		return;
	}

	if (activePointers.size === 1 && isPanning) {
		const [current] = [...activePointers.values()];
		offsetX.value = panStartOffset.x + (current.x - panStartClient.x);
		offsetY.value = panStartOffset.y + (current.y - panStartClient.y);
		hasUserZoomed.value = true;
		clampOffset();
	}
};

const endNavigationPointer = (event: PointerEvent): void => {
	activePointers.delete(event.pointerId);

	if (activePointers.size === 1) {
		// dropped from a pinch back to a single finger - resume panning from here,
		// otherwise the page would jump to match the old two-finger pan origin
		const [remaining] = [...activePointers.values()];
		isPanning = true;
		panStartClient = { x: remaining.x, y: remaining.y };
		panStartOffset = { x: offsetX.value, y: offsetY.value };
	} else if (activePointers.size === 0) {
		isPanning = false;
	}
};

const onPointerDown = (event: PointerEvent) => {
	// the comment layer sits on top and handles its own clicks while active; this
	// guard is a safety net in case a pointer event still reaches the ink canvas
	if (loading.value || saving.value || activeTool.value === "comment") return;

	// the palm lands after the pencil tip - once a pencil is down, ignore every touch
	// contact entirely (no drawing, no pan/zoom) rather than guessing which is which.
	// Ignoring it must still be an *explicit* preventDefault rather than a bare return:
	// left to itself, iOS Safari turns a resting palm into a long-press text selection,
	// and starting that gesture makes it fire pointercancel for every other contact -
	// including the pencil that is mid-stroke, which is what silently killed strokes.
	if (event.pointerType === "touch" && pencilPointerId !== undefined) {
		event.preventDefault();

		return;
	}

	if (event.pointerType === "pen") {
		pencilPointerId = event.pointerId;
		// seeing a pencil at all means a finger on the glass from now on is a palm,
		// not intentional input - flip the finger to navigate without asking
		fingerDraws.value = false;
		// a finger that was already resting (and so already tracked as navigating,
		// e.g. touched down just before the pencil did) must stop being tracked too -
		// otherwise its next move/lift would still pan the page or, worse, fall through
		// into the drawing state machine below
		activePointers.clear();
		isPanning = false;
		pinchStartDistance = 0;
	}

	if (isNavigationPointer(event)) {
		event.preventDefault();
		beginNavigationPointer(event);

		return;
	}

	event.preventDefault();
	inkCanvasRef.value?.setPointerCapture(event.pointerId);
	activeDrawingPointerId = event.pointerId;
	const point = toCanvasPoint(event);

	if (activeTool.value === "eraser") {
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
	// a lone point needs an explicit draw - a single-point path has nothing for
	// lineTo to draw, so without this a plain tap left no visible mark
	redrawInk();
};

const onPointerMove = (event: PointerEvent) => {
	if (event.pointerType === "touch" && activePointers.has(event.pointerId)) {
		updateNavigationPointer(event);

		return;
	}

	if (!isDrawingPointer(event) || event.pointerId !== activeDrawingPointerId) return;

	if (isErasing) {
		eraseAtPoint(toCanvasPoint(event));

		return;
	}

	if (!currentStroke) return;

	event.preventDefault();
	currentStroke.points.push(toCanvasPoint(event));
	redrawInk();
};

const onPointerUp = (event: PointerEvent) => {
	if (event.pointerType === "touch" && activePointers.has(event.pointerId)) {
		endNavigationPointer(event);

		return;
	}

	if (!isDrawingPointer(event) || event.pointerId !== activeDrawingPointerId) return;

	activeDrawingPointerId = undefined;

	if (event.pointerType === "pen" && event.pointerId === pencilPointerId) {
		pencilPointerId = undefined;
	}

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

// A plain reactive array (unlike the stroke model, which is only ever read imperatively
// by the canvas) - the marker layer and the popup need to re-render whenever a comment
// is added, edited or removed.
const comments = ref<PdfComment[]>([]);
const activeCommentId = ref<string | undefined>(undefined);
const commentDraftText = ref("");
const commentLayerRef = ref<HTMLElement | undefined>(undefined);

const commentsOnPage = computed(() => comments.value.filter((comment) => comment.pageIndex === currentPage.value - 1));
const activeComment = computed(() => comments.value.find((comment) => comment.id === activeCommentId.value));

const toStagePoint = (event: MouseEvent): StrokePoint => {
	const layer = commentLayerRef.value!;
	const rect = layer.getBoundingClientRect();

	return {
		x: (event.clientX - rect.left) / rect.width,
		y: (event.clientY - rect.top) / rect.height,
	};
};

const openComment = (id: string) => {
	const comment = comments.value.find((candidate) => candidate.id === id);
	if (!comment) return;

	activeCommentId.value = id;
	commentDraftText.value = comment.text;
};

const closeCommentPopup = () => {
	const comment = activeComment.value;
	if (comment) {
		const text = commentDraftText.value.trim();
		if (text) {
			comment.text = text;
		} else {
			// an empty comment is a discard, not a blank marker left behind
			comments.value = comments.value.filter((candidate) => candidate.id !== comment.id);
		}
	}

	activeCommentId.value = undefined;
	commentDraftText.value = "";
};

const deleteOpenComment = () => {
	if (!activeCommentId.value) return;

	comments.value = comments.value.filter((candidate) => candidate.id !== activeCommentId.value);
	activeCommentId.value = undefined;
	commentDraftText.value = "";
};

const onCommentLayerClick = (event: MouseEvent) => {
	if (activeTool.value !== "comment") return;

	if (activeCommentId.value) {
		// a click on the empty layer while a popup is open just closes it, rather
		// than placing a second, unwanted marker where the user meant to dismiss it
		closeCommentPopup();

		return;
	}

	const point = toStagePoint(event);
	const comment: PdfComment = {
		id: crypto.randomUUID(),
		pageIndex: currentPage.value - 1,
		x: point.x,
		y: point.y,
		text: "",
	};
	comments.value.push(comment);
	activeCommentId.value = comment.id;
	commentDraftText.value = "";
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

	// commit whatever is sitting in an open popup instead of silently losing it
	if (activeCommentId.value) {
		closeCommentPopup();
	}

	saving.value = true;
	try {
		if (props.source.kind === "pdf" && pdfBytes) {
			const blob = await import("@/utils/pdf-annotation").then((module) =>
				module.flattenStrokesIntoPdf(pdfBytes as ArrayBuffer, model.getAll(), comments.value)
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

// opening the annotator (re)loads everything; init must exist by the time this
// runs, so the watcher is declared after the function definitions (immediate:true
// runs it synchronously during setup, which would otherwise hit init in its
// temporal dead zone whenever the component is mounted already open)
watch(
	() => [props.isOpen, props.source] as const,
	([isOpen, source]) => {
		if (isOpen && source) {
			void init();
		}
	},
	{ immediate: true }
);
</script>

<style scoped>
/* A palm resting on the glass is a long-press for iOS Safari: it starts a text selection
   that runs across the whole dialog, and starting it makes Safari fire pointercancel for
   every other contact - the mid-stroke pencil included. The user then has to tap elsewhere
   to dismiss the selection before writing works again. touch-action alone does not cover
   this (it only governs scrolling/zooming), so selection and the long-press callout have to
   be switched off explicitly for the whole editor. */
.annotator-card {
	user-select: none;
	-webkit-user-select: none;
	-webkit-touch-callout: none;
}

.annotator-stage {
	min-height: 0;
	overflow: hidden;
	gap: 12px;
	flex-direction: column;
}

.annotator-error {
	max-width: 640px;
}

.annotator-viewport {
	position: relative;
	width: 100%;
	flex: 1 1 auto;
	min-height: 0;
	overflow: hidden;
	/* all panning/zooming is handled ourselves via the transform on the stack below -
	   this stops the browser's own scroll/zoom gestures from fighting it */
	touch-action: none;
}

.annotator-canvas-stack {
	position: absolute;
	top: 0;
	left: 0;
	transform-origin: 0 0;
}

.annotator-canvas {
	display: block;
	width: 100%;
	height: 100%;
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

.annotator-comment-layer {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	/* only the comment tool places/opens comments by clicking the empty layer -
	   otherwise clicks must fall through to the ink canvas underneath for drawing */
	pointer-events: none;
}

.annotator-comment-layer--active {
	pointer-events: auto;
	cursor: copy;
}

.annotator-comment-marker {
	position: absolute;
	transform: translate(-50%, -100%) scale(var(--annotator-inverse-scale, 1));
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 50% 50% 50% 0;
	background: #ffc84d;
	color: #1a1a1a;
	border: 1px solid rgb(0 0 0 / 30%);
	box-shadow: 0 1px 3px rgb(0 0 0 / 30%);
	cursor: pointer;
	/* markers stay clickable (to read/edit) even while pen/eraser is active */
	pointer-events: auto;
}

.annotator-comment-popup {
	position: absolute;
	transform: translate(-50%, 4px) scale(var(--annotator-inverse-scale, 1));
	width: min(280px, 70vw);
	padding: 8px;
	border-radius: 8px;
	background: rgb(var(--v-theme-surface));
	color: rgb(var(--v-theme-on-surface));
	box-shadow: 0 2px 10px rgb(0 0 0 / 35%);
	pointer-events: auto;
	z-index: 1;
}

/* the editor-wide selection lock above must not reach the comment text field - on iOS an
   inherited user-select: none breaks selecting and editing inside the textarea itself */
.annotator-comment-popup,
.annotator-comment-popup :deep(textarea) {
	user-select: text;
	-webkit-user-select: text;
}
</style>
