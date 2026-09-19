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
		<VBtn
			v-if="showNowButton"
			variant="text"
			size="small"
			:disabled="disabled"
			:prepend-icon="mdiClockFast"
			class="now-button"
			data-testid="assignment-due-now"
			@click="setNow"
		>
			{{ t("common.actions.now") }}
		</VBtn>
	</div>
</template>

<script setup lang="ts">
// DateTimePicker.vue was removed in the date/time-utils rework upstream; this combines
// the two remaining single-purpose pickers instead of reviving it, to keep this out of
// the way of future upstream syncs to that area.
import { ISO_DATE_FORMAT, nowUtc, parseUtc, toCombinedDateTimeIso } from "@/utils/date-time.utils";
import { mdiClockFast } from "@icons/material";
import { DatePicker, TimePicker } from "@ui-date-time-picker";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	modelValue?: string; // ISO 8601 datetime string, UTC
	dateLabel?: string;
	timeLabel?: string;
	disabled?: boolean;
	// Only sensible for a start date ("start immediately") - setting a due date to "now"
	// would close the assignment right away, so this defaults to off.
	showNowButton?: boolean;
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
		// DatePicker's `date` prop wants an ISO date (it locale-formats internally for
		// display); formatUtc(..., "date") instead returns an already locale-formatted
		// string ("15.09.2026"), which DatePicker then fails to parse. Derive both parts
		// from the same local moment so they never disagree across a day boundary.
		const local = value ? parseUtc(value).local() : undefined;
		datePart.value = local?.format(ISO_DATE_FORMAT);
		timePart.value = local?.format("HH:mm");
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

const setNow = () => {
	const local = nowUtc().local();
	datePart.value = local.format(ISO_DATE_FORMAT);
	timePart.value = local.format("HH:mm");
	emit("update:modelValue", combined.value);
};
</script>

<style scoped lang="scss">
.due-date-time-field {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	flex-wrap: wrap;

	> * {
		flex: 1 1 140px;
	}

	.now-button {
		flex: 0 0 auto;
		margin-top: 4px;
	}
}
</style>
