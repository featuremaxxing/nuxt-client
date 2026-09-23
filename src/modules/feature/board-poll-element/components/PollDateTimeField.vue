<template>
	<div class="poll-date-time-field">
		<DatePicker :date="datePart" :label="dateLabel" data-testid="poll-date-time-date" @update:date="onUpdateDate" />
		<TimePicker
			:time="timePart"
			:label="timeLabel ?? t('common.labels.time')"
			data-testid="poll-date-time-time"
			@update:time="onUpdateTime"
		/>
		<VBtn
			v-if="showNowButton"
			variant="text"
			size="small"
			:prepend-icon="mdiClockFast"
			class="now-button"
			data-testid="poll-date-time-now"
			@click="setNow"
		>
			{{ t("common.actions.now") }}
		</VBtn>
	</div>
</template>

<script setup lang="ts">
// Same DatePicker/TimePicker combination as DueDateTimeField.vue (board-assignment-element
// module, on feature/room-assignments) - kept as a local copy rather than a cross-module import
// so this module stays self-contained, per the reasoning that already applied to the
// closesAt-only version this replaces.
import { ISO_DATE_FORMAT, nowUtc, parseUtc, toCombinedDateTimeIso } from "@/utils/date-time.utils";
import { mdiClockFast } from "@icons/material";
import { DatePicker, TimePicker } from "@ui-date-time-picker";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	modelValue?: string; // ISO 8601 datetime string, UTC
	dateLabel: string;
	timeLabel?: string;
	// Only sensible for a start time ("start immediately") - setting an end time to "now"
	// would close the poll right away, so this defaults to off.
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
.poll-date-time-field {
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
