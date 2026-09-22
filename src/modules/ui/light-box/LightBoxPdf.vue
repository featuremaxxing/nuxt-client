<template>
	<div ref="scrollContainerRef" class="pdf-viewer" data-testid="light-box-pdf" @click="openCommentId = undefined">
		<div v-if="hasError" class="text-caption">
			{{ t("components.cardElement.fileElement.pdfLoadError") }}
		</div>
		<div
			v-for="(page, index) in pages"
			:key="index"
			class="pdf-page-slot"
			:data-testid="`light-box-pdf-page-${index + 1}`"
		>
			<div class="pdf-page-wrapper">
				<canvas v-show="page.rendered" :ref="setCanvasRef(index)" class="pdf-page" />
				<VProgressCircular v-if="!page.rendered" indeterminate size="small" class="my-8" />

				<div v-if="page.rendered" class="pdf-comment-layer">
					<button
						v-for="comment in commentsForPage(index)"
						:key="comment.id"
						type="button"
						class="pdf-comment-marker"
						:style="{ left: `${comment.x * 100}%`, top: `${comment.y * 100}%` }"
						:aria-label="t('components.cardElement.fileElement.pdfCommentOpen')"
						:data-testid="`light-box-pdf-comment-marker-${comment.id}`"
						@click.stop="toggleComment(comment.id)"
					>
						<VIcon :icon="mdiCommentTextOutline" size="small" />
					</button>

					<div
						v-if="openComment && openComment.pageIndex === index"
						class="pdf-comment-popup"
						:style="{ left: `${openComment.x * 100}%`, top: `${openComment.y * 100}%` }"
						data-testid="light-box-pdf-comment-popup"
						@click.stop
					>
						{{ openComment.text }}
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { type PdfComment, readPdfComments } from "@/utils/pdf-annotation";
import { renderPdfPageToCanvas } from "@/utils/pdf-renderer";
import { mdiCommentTextOutline } from "@icons/material";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Lightweight multi-page PDF viewer for the LightBox. Pages are rendered lazily
// as they approach the viewport, so large documents do not hit mobile canvas
// memory limits.
const props = defineProps<{
	url: string;
}>();

const { t } = useI18n();

const scrollContainerRef = ref<HTMLElement | undefined>(undefined);
const pages = ref<{ rendered: boolean }[]>([]);
const hasError = ref(false);

// Text comments left by a teacher's correction (PDF-only) - shown as clickable
// markers here, read-only. Loaded once for the whole document since it is
// lightweight annotation metadata, independent of the lazy per-page rendering below.
const comments = ref<PdfComment[]>([]);
const openCommentId = ref<string | undefined>(undefined);
const openComment = computed(() => comments.value.find((comment) => comment.id === openCommentId.value));
const commentsForPage = (pageIndex: number) => comments.value.filter((comment) => comment.pageIndex === pageIndex);
const toggleComment = (id: string) => {
	openCommentId.value = openCommentId.value === id ? undefined : id;
};

const canvasRefs = new Map<number, HTMLCanvasElement>();
const observers: IntersectionObserver[] = [];

const setCanvasRef = (index: number) => (element: unknown) => {
	if (element instanceof HTMLCanvasElement) {
		canvasRefs.set(index, element);
	}
};

const observePage = (index: number, slot: HTMLElement) => {
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;

				observer.disconnect();
				void renderPage(index + 1, canvasRefs.get(index));
			}
		},
		{ root: scrollContainerRef.value, rootMargin: "600px 0px" }
	);
	observers.push(observer);
	observer.observe(slot);
};

const renderPage = async (pageNumber: number, canvas: HTMLCanvasElement | undefined) => {
	try {
		if (!pdfDoc) return;
		if (canvas) {
			await renderPdfPageToCanvas(pdfDoc, pageNumber, canvas);
		}
		pages.value[pageNumber - 1].rendered = true;
	} catch {
		hasError.value = true;
	}
};

let pdfDoc: PDFDocumentProxy | undefined;

const init = async () => {
	hasError.value = false;
	comments.value = [];
	openCommentId.value = undefined;
	try {
		const { loadPdf } = await import("@/utils/pdf-renderer");
		const response = await fetch(props.url);
		pdfDoc = await loadPdf(await response.arrayBuffer());
		pages.value = Array.from({ length: pdfDoc.numPages }, () => ({ rendered: false }));
		comments.value = await readPdfComments(pdfDoc);

		// wait one tick so the page slots are mounted before observing them
		await new Promise((resolve) => requestAnimationFrame(resolve));
		Array.from(scrollContainerRef.value?.querySelectorAll(".pdf-page-slot") ?? []).forEach((slot, index) => {
			observePage(index, slot as HTMLElement);
		});
	} catch {
		hasError.value = true;
	}
};

onMounted(init);

watch(
	() => props.url,
	() => void init()
);

onBeforeUnmount(() => {
	observers.forEach((observer) => observer.disconnect());
	pdfDoc?.destroy();
});
</script>

<style scoped>
.pdf-viewer {
	/* pinned to the dialog area below the 64px toolbar - the surrounding light box
	   flex layout clips tall pages, and app navigation can stack above the dialog */
	position: absolute;
	top: 64px;
	right: 0;
	bottom: 0;
	left: 0;
	overflow: auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 12px;
}

.pdf-page-slot {
	min-height: 80px;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.pdf-page-wrapper {
	/* sized to the canvas's own (possibly shrunk) display box, so the comment
	   layer's percentage-based marker positions line up with the visible page */
	position: relative;
	display: inline-block;
}

.pdf-page {
	display: block;
	/* the canvas renders at up to 2400px for sharpness - cap the display size to a
	   readable page width instead of showing the intrinsic resolution */
	max-width: min(100%, 900px);
	height: auto;
	box-shadow: 0 1px 6px rgb(0 0 0 / 25%);
	background: #ffffff;
}

.pdf-comment-layer {
	position: absolute;
	inset: 0;
	/* read-only viewer: nothing here captures clicks except the markers/popup
	   themselves, so the page underneath stays scrollable and pinch-zoomable */
	pointer-events: none;
}

.pdf-comment-marker {
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
	pointer-events: auto;
}

.pdf-comment-popup {
	position: absolute;
	transform: translate(-50%, 4px);
	width: min(280px, 70vw);
	padding: 8px 10px;
	border-radius: 8px;
	background: rgb(var(--v-theme-surface));
	color: rgb(var(--v-theme-on-surface));
	box-shadow: 0 2px 10px rgb(0 0 0 / 35%);
	pointer-events: auto;
	z-index: 1;
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
