<template>
	<VTextField
		:id="timePickerId"
		ref="time-text-field"
		v-model="timeValue"
		v-maska="timeMask"
		data-testid="time-input"
		:prepend-inner-icon="mdiClockOutline"
		:label="label"
		:placeholder="timePlaceHolder"
		:rules="validationRules"
		@update:model-value="validate"
		@keydown.up.down.stop
		@keydown.space="showTimePicker = true"
		@keydown.prevent.enter="showTimePicker = true"
		@keydown.tab="showTimePicker = false"
	/>
	<VMenu
		v-model="showTimePicker"
		transition="scale-transition"
		:close-on-content-click="false"
		:activator="`#${timePickerId}`"
	>
		<UseFocusTrap :options="{ immediate: true }">
			<VCard elevation="6" data-testid="time-picker-menu">
				<VTimePicker :model-value="timeValue" format="24hr" color="primary" @update:model-value="onPickTime" />
				<VCardActions>
					<VBtn variant="text" size="small" data-testid="time-picker-close" @click="showTimePicker = false">
						{{ t("common.actions.ok") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</UseFocusTrap>
	</VMenu>
</template>

<script setup lang="ts">
import { useLocalizedDateTime } from "@/composables/date-time.composables";
import { mdiClockOutline } from "@icons/material";
import { isRequired, isValidTime } from "@util-validators";
import { UseFocusTrap } from "@vueuse/integrations/useFocusTrap/component";
import { vMaska } from "maska/vue";
import { computed, ref, useId, useTemplateRef, watchEffect } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	time: { type: String, default: "" },
	label: { type: String, default: "" },
	required: { type: Boolean },
});

const emit = defineEmits<{
	(e: "update:time", value: string | undefined): void;
}>();

const { t } = useI18n();
const { timeMask, timePlaceHolder } = useLocalizedDateTime();

const timeValue = ref<string>();
const timeTextField = useTemplateRef("time-text-field");
const showTimePicker = ref(false);

const uniqueId = useId();
const timePickerId = computed(() => `menu-activator-${uniqueId}`);

watchEffect(() => {
	timeValue.value = props.time;
});

const validationRules = computed(() => [
	props.required ? isRequired(t("components.timePicker.validation.required")) : true,
	isValidTime,
]);

const validate = async () => {
	if (timeTextField.value === null) return;

	await timeTextField.value.validate();
	const isValid = timeTextField.value.isValid;

	if (isValid) {
		emit("update:time", timeValue.value);
	}
};

// VTimePicker keeps emitting partial values while the hour/minute dial is being dragged
// (e.g. "14:00" the instant the hour is set) - only the text field's own masked input is
// validated on every keystroke, so picker selections go through the same validate() path.
const onPickTime = (value: string | null) => {
	if (value === null) return;
	timeValue.value = value;
	validate();
};
</script>
