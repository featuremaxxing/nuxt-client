<template>
	<div>
		<div ref="container" class="model-3d prevent-card-drag" data-testid="model-3d-display">
			<canvas
				v-show="state === 'ready'"
				ref="canvas"
				class="model-3d__canvas"
				role="img"
				:aria-label="t('components.cardElement.fileElement.model3d.label', { name })"
				data-testid="model-3d-canvas"
			/>
			<div v-if="state === 'idle' || state === 'loading'" class="model-3d__overlay">
				<VProgressCircular indeterminate color="primary" data-testid="model-3d-loading" />
			</div>
			<div
				v-else-if="state === 'error'"
				class="model-3d__overlay text-body-2 text-medium-emphasis px-6 text-center"
				data-testid="model-3d-error"
			>
				{{ errorMessage }}
			</div>
			<div v-if="state === 'ready'" class="model-3d__hint text-caption" aria-hidden="true">
				<VIcon :icon="mdiRotate3dVariant" size="small" />
				{{ t("components.cardElement.fileElement.model3d.dragToRotate") }}
			</div>
		</div>
		<ContentElementBar class="menu">
			<template v-if="showMenu" #menu><slot /></template>
		</ContentElementBar>
	</div>
</template>

<script setup lang="ts">
import type { Model3dViewer } from "./model-3d-viewer";
import type { Model3dFormat } from "@/utils/fileHelper";
import { mdiRotate3dVariant } from "@icons/material";
import { ContentElementBar } from "@ui-board";
import { useIntersectionObserver, useResizeObserver } from "@vueuse/core";
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

type Props = {
	src: string;
	name: string;
	format: Model3dFormat;
	size: number;
	showMenu: boolean;
};

const props = defineProps<Props>();

// larger models take too long to download and parse inside a card
const MAX_PREVIEW_SIZE = 50 * 1024 * 1024;

const { t } = useI18n();

const container = useTemplateRef<HTMLDivElement>("container");
const canvas = useTemplateRef<HTMLCanvasElement>("canvas");

type ErrorReason = "too-large" | "external-resources" | "failed";
const state = ref<"idle" | "loading" | "ready" | "error">("idle");
const errorReason = ref<ErrorReason>("failed");

const errorMessage = computed(() => {
	switch (errorReason.value) {
		case "too-large":
			return t("components.cardElement.fileElement.model3d.error.tooLarge");
		case "external-resources":
			return t("components.cardElement.fileElement.model3d.error.externalResources");
		default:
			return t("components.cardElement.fileElement.model3d.error.failed");
	}
});

let viewer: Model3dViewer | undefined;
let isUnmounted = false;
const abortController = new AbortController();

const showError = (reason: ErrorReason) => {
	errorReason.value = reason;
	state.value = "error";
};

const resizeViewer = () => {
	const element = container.value;
	if (viewer && element) viewer.resize(element.clientWidth, element.clientHeight);
};

const load = async () => {
	if (props.size > MAX_PREVIEW_SIZE) {
		showError("too-large");
		return;
	}

	state.value = "loading";
	try {
		const [response, { loadModel3d, createModel3dViewer }] = await Promise.all([
			fetch(props.src, { signal: abortController.signal }),
			import("./model-3d-viewer"),
		]);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const model = await loadModel3d(await response.arrayBuffer(), props.format);
		if (isUnmounted) return;

		state.value = "ready";
		await nextTick();
		if (!canvas.value) return;

		viewer = createModel3dViewer(canvas.value, model);
		resizeViewer();
	} catch (error) {
		if (isUnmounted) return;
		// Model3dLoadError lives in the lazily loaded chunk, so it is matched by its message
		const isExternalResources = error instanceof Error && error.message === "external-resources";
		showError(isExternalResources ? "external-resources" : "failed");
	}
};

// only download and render once the card scrolls into view
const { stop: stopObserving } = useIntersectionObserver(container, ([entry]) => {
	if (entry?.isIntersecting && state.value === "idle") {
		stopObserving();
		load();
	}
});

useResizeObserver(container, resizeViewer);

onBeforeUnmount(() => {
	isUnmounted = true;
	abortController.abort();
	viewer?.dispose();
	viewer = undefined;
});
</script>

<style lang="scss" scoped>
.model-3d {
	position: relative;
	aspect-ratio: 16 / 9;
	background-color: rgba(var(--v-theme-on-surface), 0.04);
	cursor: grab;

	&:active {
		cursor: grabbing;
	}
}

.model-3d__canvas {
	display: block;
	width: 100%;
	height: 100%;
	touch-action: none;
}

.model-3d__overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: default;
}

.model-3d__hint {
	position: absolute;
	left: 8px;
	bottom: 6px;
	display: flex;
	align-items: center;
	gap: 4px;
	color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
	pointer-events: none;
}

.menu {
	position: absolute;
	top: 0;
	right: 0;
}
</style>
