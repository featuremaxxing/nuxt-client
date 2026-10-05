<template>
	<section class="room-collection-panel" :aria-label="collectionTitle" data-testid="room-collection-panel">
		<div class="d-flex align-center flex-wrap ga-2">
			<VTextField
				ref="titleField"
				v-model="title"
				class="room-collection-title no-drag"
				variant="underlined"
				density="compact"
				hide-details
				maxlength="100"
				:label="t('pages.rooms.collections.title.label')"
				:placeholder="t('pages.rooms.collections.title.placeholder')"
				data-testid="room-collection-title-input"
				@blur="commitTitle"
				@keydown.enter.prevent="blurTitle"
				@keydown.esc.prevent="resetTitle"
			/>
			<span class="text-medium-emphasis">
				{{ t("pages.rooms.collections.roomCount", { count: roomCount }, roomCount) }}
			</span>
			<div class="ml-auto d-flex ga-1">
				<VBtn variant="text" color="primary" data-testid="room-collection-dissolve" @click="$emit('dissolve')">
					{{ t("pages.rooms.collections.dissolve") }}
				</VBtn>
				<VBtn variant="text" color="primary" data-testid="room-collection-close" @click="$emit('close')">
					{{ t("pages.rooms.collections.close") }}
				</VBtn>
			</div>
		</div>
		<p class="text-medium-emphasis my-2">{{ t("pages.rooms.collections.hint") }}</p>
		<div ref="container" class="room-collection-panel-grid" role="application">
			<slot />
		</div>
	</section>
</template>

<script setup lang="ts">
import { RoomCollection } from "@data-room";
import { computed, nextTick, onMounted, PropType, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	collection: { type: Object as PropType<RoomCollection>, required: true },
	roomCount: { type: Number, required: true },
	focusTitle: { type: Boolean, default: false },
});

const emit = defineEmits<{
	(e: "rename", title: string): void;
	(e: "dissolve"): void;
	(e: "close"): void;
}>();

const { t } = useI18n();

const container = useTemplateRef<HTMLElement>("container");
const titleField = useTemplateRef<{ focus: () => void; select: () => void; blur: () => void }>("titleField");

const title = ref("");
watch(
	() => props.collection.title,
	(newTitle) => (title.value = newTitle),
	{ immediate: true }
);

const collectionTitle = computed(() => props.collection.title || t("pages.rooms.collections.untitled"));

const commitTitle = () => {
	const trimmed = title.value.trim();
	if (trimmed !== props.collection.title) emit("rename", trimmed);
};
const blurTitle = () => titleField.value?.blur();
const resetTitle = () => {
	title.value = props.collection.title;
	blurTitle();
};

onMounted(async () => {
	if (!props.focusTitle) return;
	await nextTick();
	titleField.value?.focus();
	titleField.value?.select();
});

defineExpose({ container });
</script>

<style lang="scss" scoped>
.room-collection-panel {
	grid-column: 1 / -1;
	padding: 12px 16px 16px;
	border-radius: 8px;
	background: rgb(var(--v-theme-surface));
	outline: 2px solid rgb(var(--v-theme-primary));
	cursor: default;
}

.room-collection-title {
	flex: 1 1 220px;
	min-width: 0;

	:deep(input) {
		font-size: 1.25rem;
		font-weight: bold;
	}
}

.room-collection-panel-grid {
	display: grid;
	grid-gap: 16px;
	grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
	min-height: 120px;
	padding: 12px;
	border-radius: 6px;
	background: rgba(var(--v-theme-on-surface), 0.04);
}

.room-collection-panel-grid > :deep(*) {
	animation: fan-out 420ms cubic-bezier(0.25, 1.2, 0.4, 1) backwards;
}

@for $i from 1 through 12 {
	.room-collection-panel-grid > :deep(:nth-child(#{$i})) {
		animation-delay: #{($i - 1) * 45}ms;
	}
}

@keyframes fan-out {
	from {
		transform: translateY(-24px) scale(0.9);
		opacity: 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.room-collection-panel-grid > :deep(*) {
		animation: none;
	}
}
</style>
