<template>
	<div ref="scrollContainerRef" class="pdf-viewer" data-testid="light-box-pdf">
		<div v-if="hasError" class="text-caption">
			{{ t("components.cardElement.fileElement.pdfLoadError") }}
		</div>
		<div
			v-for="(page, index) in pages"
			:key="index"
			class="pdf-page-slot"
			:data-testid="`light-box-pdf-page-${index + 1}`"
		>
			<canvas v-show="page.rendered" :ref="setCanvasRef(index)" class="pdf-page" />
			<VProgressCircular v-if="!page.rendered" indeterminate size="small" class="my-8" />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPdfPageToCanvas } from "@/utils/pdf-renderer";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
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
	try {
		const { loadPdf } = await import("@/utils/pdf-renderer");
		const response = await fetch(props.url);
		pdfDoc = await loadPdf(await response.arrayBuffer());
		pages.value = Array.from({ length: pdfDoc.numPages }, () => ({ rendered: false }));

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
	/* the LightBox toolbar is 64px - without an explicit height the scroll
	   container collapses and the lazy page rendering never triggers */
	height: calc(100vh - 64px);
	height: calc(100dvh - 64px);
	width: 100%;
	overflow: auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 12px;
}

.pdf-page-slot {
	min-height: 80px;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.pdf-page {
	display: block;
	max-width: 100%;
	height: auto;
	box-shadow: 0 1px 6px rgb(0 0 0 / 25%);
	background: #ffffff;
}
</style>
