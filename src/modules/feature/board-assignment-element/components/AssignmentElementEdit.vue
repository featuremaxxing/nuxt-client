<template>
	<VCardText class="assignment-edit">
		<VTextField
			:model-value="modelValue.title"
			:label="t('components.cardElement.assignmentElement.title')"
			data-testid="assignment-title"
			@update:model-value="(value: string) => (modelValue.title = value)"
		/>
		<VTextarea
			:model-value="modelValue.text"
			:label="t('components.cardElement.assignmentElement.description')"
			auto-grow
			rows="2"
			data-testid="assignment-description"
			@update:model-value="(value: string) => (modelValue.text = value)"
		/>
		<DueDateTimeField
			:model-value="modelValue.startDate ?? undefined"
			:date-label="t('components.cardElement.assignmentElement.startDate')"
			data-testid="assignment-start-date-time"
			@update:model-value="(value?: string) => (modelValue.startDate = value ?? null)"
		/>
		<DueDateTimeField
			:model-value="modelValue.dueDate ?? undefined"
			data-testid="assignment-due-date-time"
			@update:model-value="(value?: string) => (modelValue.dueDate = value ?? null)"
		/>
		<div class="assignment-edit-row">
			<GraceMinutesSelect
				:model-value="modelValue.graceMinutes ?? 0"
				@update:model-value="(value: number) => (modelValue.graceMinutes = value)"
			/>
			<VTextField
				:model-value="modelValue.maxPoints"
				type="number"
				min="1"
				:label="t('components.cardElement.assignmentElement.maxPoints')"
				data-testid="assignment-max-points"
				@update:model-value="(value: string) => (modelValue.maxPoints = value ? Number(value) : null)"
			/>
		</div>
	</VCardText>
</template>

<script setup lang="ts">
import DueDateTimeField from "./DueDateTimeField.vue";
import GraceMinutesSelect from "./GraceMinutesSelect.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { useContentElementState } from "@data-board";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: AssignmentElement;
	isEditMode: boolean;
}>();

const { t } = useI18n();

const { modelValue } = useContentElementState(props, { autoSaveDebounce: 400 });
</script>

<style scoped lang="scss">
.assignment-edit {
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.assignment-edit-row {
	display: flex;
	gap: 12px;

	> * {
		flex: 1 1 160px;
	}
}
</style>
