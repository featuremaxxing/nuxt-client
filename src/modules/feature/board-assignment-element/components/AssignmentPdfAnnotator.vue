<template>
	<VDialog
		:model-value="isOpen"
		fullscreen
		scrollable
		:z-index="3000"
		data-testid="assignment-pdf-annotator"
		@update:model-value="(value: boolean) => !value && emit('cancel')"
	>
		<VCard>
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
	mdiPen,
	mdiPencil,
	mdiUndo,
} from "@icons/material";
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

const toCanvasPoint = (event: PointerEvent): StrokePoint => {
	const ink = inkCanvasRef.value!;
	const rect = ink.getBoundingClientRect();

	return {
		x: (event.clientX - rect.left) / rect.width,
		y: (event.clientY - rect.top) / rect.height,
	};
};

const onPointerDown = (event: PointerEvent) => {
	// the comment layer sits on top and handles its own clicks while active; this
	// guard is a safety net in case a pointer event still reaches the ink canvas
	if (loading.value || saving.value || activeTool.value === "comment") return;

	event.preventDefault();
	inkCanvasRef.value?.setPointerCapture(event.pointerId);
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
	/* keep the page at a workable size on large screens - the canvas itself renders
	   at high resolution for sharp pen strokes */
	max-width: min(100%, 1100px);
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
	transform: translate(-50%, -100%);
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
	transform: translate(-50%, 4px);
	width: min(280px, 70vw);
	padding: 8px;
	border-radius: 8px;
	background: rgb(var(--v-theme-surface));
	color: rgb(var(--v-theme-on-surface));
	box-shadow: 0 2px 10px rgb(0 0 0 / 35%);
	pointer-events: auto;
	z-index: 1;
}
</style>
