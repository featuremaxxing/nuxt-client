<template>
	<VSelect
		:model-value="modelValue"
		:items="items"
		:label="t('components.cardElement.assignmentElement.graceMinutes')"
		:disabled="disabled"
		data-testid="assignment-grace-minutes"
		@update:model-value="(value: number) => emit('update:modelValue', value)"
	/>
</template>

<script setup lang="ts">
// A dropdown of presets, not a duration picker: this matches how a teacher actually
// thinks about grace periods ("a bit of slack", "until tonight"), and is one component
// instead of two number inputs.
import { computed } from "vue";
import { useI18n } from "vue-i18n";

defineProps<{
	modelValue?: number;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: number): void;
}>();

const { t } = useI18n();

const items = computed(() => [
	{ title: t("components.cardElement.assignmentElement.graceMinutes.none"), value: 0 },
	{ title: t("components.cardElement.assignmentElement.graceMinutes.15m"), value: 15 },
	{ title: t("components.cardElement.assignmentElement.graceMinutes.1h"), value: 60 },
	{ title: t("components.cardElement.assignmentElement.graceMinutes.12h"), value: 12 * 60 },
	{ title: t("components.cardElement.assignmentElement.graceMinutes.1d"), value: 24 * 60 },
	{ title: t("components.cardElement.assignmentElement.graceMinutes.3d"), value: 3 * 24 * 60 },
]);
</script>
