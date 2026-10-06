<template>
	<section class="room-tag-panel" :aria-label="tag.name" data-testid="room-tag-panel">
		<div class="d-flex align-center flex-wrap ga-2">
			<VTextField
				ref="nameField"
				v-model="name"
				class="room-tag-name"
				variant="underlined"
				density="compact"
				hide-details
				maxlength="50"
				:label="t('pages.rooms.tags.name.label')"
				data-testid="room-tag-name-input"
				@blur="commitName"
				@keydown.enter.prevent="blurName"
				@keydown.esc.prevent="resetName"
			/>
			<span class="text-medium-emphasis">
				{{ t("pages.rooms.tags.roomCount", { count: roomCount }, roomCount) }}
			</span>
			<div class="ml-auto d-flex ga-1">
				<VBtn
					variant="text"
					color="primary"
					:prepend-icon="mdiTagRemoveOutline"
					data-testid="room-tag-delete"
					@click="$emit('delete')"
				>
					{{ t("pages.rooms.tags.delete") }}
				</VBtn>
				<VBtn variant="text" color="primary" data-testid="room-tag-close" @click="$emit('close')">
					{{ t("pages.rooms.tags.close") }}
				</VBtn>
			</div>
		</div>
		<div class="room-tag-panel-grid mt-3">
			<slot />
		</div>
	</section>
</template>

<script setup lang="ts">
import { RoomTag } from "@data-room";
import { mdiTagRemoveOutline } from "@icons/material";
import { PropType, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	tag: { type: Object as PropType<RoomTag>, required: true },
	roomCount: { type: Number, required: true },
});

const emit = defineEmits<{
	(e: "rename", name: string): void;
	(e: "delete"): void;
	(e: "close"): void;
}>();

const { t } = useI18n();

const nameField = useTemplateRef<{ blur: () => void }>("nameField");

const name = ref("");
watch(
	() => props.tag.name,
	(newName) => (name.value = newName),
	{ immediate: true }
);

// a tag needs a name: an emptied field falls back to the current one
const commitName = () => {
	const trimmed = name.value.trim();
	if (!trimmed) {
		name.value = props.tag.name;
		return;
	}
	if (trimmed !== props.tag.name) emit("rename", trimmed);
};
const blurName = () => nameField.value?.blur();
const resetName = () => {
	name.value = props.tag.name;
	blurName();
};
</script>

<style lang="scss" scoped>
.room-tag-panel {
	grid-column: 1 / -1;
	padding: 12px 16px 16px;
	border-radius: 8px;
	background: rgb(var(--v-theme-surface));
	outline: 2px solid rgb(var(--v-theme-primary));
	cursor: default;
}

.room-tag-name {
	flex: 1 1 220px;
	min-width: 0;

	:deep(input) {
		font-size: 1.25rem;
		font-weight: bold;
	}
}

.room-tag-panel-grid {
	display: grid;
	grid-gap: 16px;
	grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
	min-height: 120px;
	padding: 12px;
	border-radius: 6px;
	background: rgba(var(--v-theme-on-surface), 0.04);
}

.room-tag-panel-grid > :deep(*) {
	animation: fan-out 420ms cubic-bezier(0.25, 1.2, 0.4, 1) backwards;
}

@for $i from 1 through 12 {
	.room-tag-panel-grid > :deep(:nth-child(#{$i})) {
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
	.room-tag-panel-grid > :deep(*) {
		animation: none;
	}
}
</style>
