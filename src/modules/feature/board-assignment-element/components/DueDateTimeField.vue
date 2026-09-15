<template>
	<div class="due-date-time-field">
		<DatePicker
			:date="datePart"
			:label="dateLabel ?? t('components.cardElement.assignmentElement.dueDate')"
			:disabled="disabled"
			data-testid="assignment-due-date"
			@update:date="onUpdateDate"
		/>
		<TimePicker
			:time="timePart"
			:label="timeLabel ?? t('common.labels.time')"
			:disabled="disabled"
			data-testid="assignment-due-time"
			@update:time="onUpdateTime"
		/>
	</div>
</template>

<script setup lang="ts">
// DateTimePicker.vue was removed in the date/time-utils rework upstream; this combines
// the two remaining single-purpose pickers instead of reviving it, to keep this out of
// the way of future upstream syncs to that area.
import { formatUtc, toCombinedDateTimeIso } from "@/utils/date-time.utils";
import { DatePicker, TimePicker } from "@ui-date-time-picker";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	modelValue?: string; // ISO 8601 datetime string, UTC
	dateLabel?: string;
	timeLabel?: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: string | undefined): void;
}>();

const { t } = useI18n();

const datePart = ref<string | undefined>();
const timePart = ref<string | undefined>();

watch(
	() => props.modelValue,
	(value) => {
		datePart.value = value ? formatUtc(value, "date") : undefined;
		timePart.value = value ? formatUtc(value, "time") : undefined;
	},
	{ immediate: true }
);

const combined = computed(() => toCombinedDateTimeIso(datePart.value, timePart.value));

const onUpdateDate = (value: string | undefined) => {
	datePart.value = value;
	emit("update:modelValue", combined.value);
};

const onUpdateTime = (value: string | undefined) => {
	timePart.value = value;
	emit("update:modelValue", combined.value);
};
</script>

<style scoped lang="scss">
.due-date-time-field {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;

	> * {
		flex: 1 1 140px;
	}
}
</style>
