<template>
	<div class="text-viewer" data-testid="light-box-text">
		<div v-if="hasError" class="text-caption">
			{{ t("components.cardElement.fileElement.textLoadError") }}
		</div>
		<template v-else>
			<pre class="text-content" data-testid="light-box-text-content">{{ content }}</pre>
			<div v-if="isTruncated" class="text-caption text-truncated-hint" data-testid="light-box-text-truncated">
				{{ t("components.cardElement.fileElement.textTruncated") }}
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Larger files would freeze the tab rendering a single <pre> - cut them off and
// say so, rather than trying to display the whole thing.
const MAX_TEXT_BYTES = 512 * 1024;

const props = defineProps<{
	url: string;
}>();

const { t } = useI18n();

const content = ref("");
const hasError = ref(false);
const isTruncated = ref(false);

const init = async () => {
	hasError.value = false;
	isTruncated.value = false;
	content.value = "";
	try {
		const response = await fetch(props.url);
		if (!response.ok) {
			hasError.value = true;
			return;
		}
		const blob = await response.blob();
		isTruncated.value = blob.size > MAX_TEXT_BYTES;
		const slice = isTruncated.value ? blob.slice(0, MAX_TEXT_BYTES) : blob;
		content.value = await slice.text();
	} catch {
		hasError.value = true;
	}
};

onMounted(init);

watch(
	() => props.url,
	() => void init()
);
</script>

<style scoped>
.text-viewer {
	width: 100%;
	height: 100%;
	overflow: auto;
	padding: 24px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.text-content {
	width: 100%;
	max-width: 900px;
	white-space: pre-wrap;
	word-break: break-word;
	font-family: monospace;
	font-size: 14px;
	background: #ffffff;
	color: #1a1a1a;
	padding: 16px;
	border-radius: 4px;
	box-shadow: 0 1px 6px rgb(0 0 0 / 25%);
}

.text-truncated-hint {
	margin-top: 8px;
	color: #ffffff;
}
</style>
