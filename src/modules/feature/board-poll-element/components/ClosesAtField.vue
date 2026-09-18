<template>
	<div class="closes-at-field">
		<DatePicker
			:date="datePart"
			:label="t('components.cardElement.pollElement.closesAt')"
			data-testid="poll-closes-at-date"
			@update:date="onUpdateDate"
		/>
		<TimePicker :time="timePart" :label="t('common.labels.time')" data-testid="poll-closes-at-time" @update:time="onUpdateTime" />
	</div>
</template>

<script setup lang="ts">
// Small equivalent of the DueDateTimeField pattern used for the assignment element, recreated
// locally instead of importing across branches/modules to keep this module self-contained.
import { ISO_DATE_FORMAT, parseUtc, toCombinedDateTimeIso } from "@/utils/date-time.utils";
import { DatePicker, TimePicker } from "@ui-date-time-picker";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	modelValue?: string; // ISO 8601 datetime string, UTC
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
</script>

<style scoped lang="scss">
.closes-at-field {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;

	> * {
		flex: 1 1 140px;
	}
}
</style>
