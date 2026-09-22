<template>
	<VCardText data-testid="ai-question-element-edit">
		<VTextarea
			v-model="modelValue.question"
			:label="t('components.cardElement.aiQuestionElement.question')"
			:placeholder="t('components.cardElement.aiQuestionElement.questionPlaceholder')"
			variant="outlined"
			rows="2"
			auto-grow
			data-testid="ai-question-edit-question"
		/>
		<VTextarea
			:model-value="aiInstructions"
			:label="t('components.cardElement.aiQuestionElement.aiInstructions')"
			:placeholder="t('components.cardElement.aiQuestionElement.aiInstructionsPlaceholder')"
			variant="outlined"
			rows="2"
			auto-grow
			data-testid="ai-question-edit-instructions"
			@update:model-value="(value: string | null) => setPrivateFields({ aiInstructions: value ?? '' })"
		/>
		<VTextarea
			:model-value="expectedAnswer"
			:label="t('components.cardElement.aiQuestionElement.expectedAnswer')"
			variant="outlined"
			rows="2"
			auto-grow
			:hint="t('components.cardElement.aiQuestionElement.expectedAnswerHint')"
			persistent-hint
			data-testid="ai-question-edit-expected-answer"
			@update:model-value="(value: string | null) => setPrivateFields({ expectedAnswer: value ?? '' })"
		/>
		<VCheckbox
			:model-value="modelValue.allowMultipleAttempts"
			:label="t('components.cardElement.aiQuestionElement.allowMultipleAttempts')"
			density="compact"
			hide-details
			data-testid="ai-question-edit-multiple-attempts"
			@update:model-value="(value: boolean | null) => setAllowMultipleAttempts(!!value)"
		/>
	</VCardText>
</template>

<script setup lang="ts">
import { AiQuestionElement } from "@/types/board/ContentElement";
import { useAiQuestionApi } from "@data-ai-question";
import { useContentElementState } from "@data-board";
import { onMounted, ref } from "vue";

const props = defineProps<{
	element: AiQuestionElement;
	isEditMode: boolean;
}>();

// Autosaved like every element's edit form. The broadcast content carries only
// question/allowMultipleAttempts - the teacher's private aiInstructions/expectedAnswer
// arrive through the config endpoint and are merged into the autosaved body (see
// setPrivateFields; the server treats absent fields as "unchanged", so autosaves that
// fire before the config loads can never wipe the teacher's text).
const { modelValue } = useContentElementState(props, { autoSaveDebounce: 400 });

const { fetchConfig } = useAiQuestionApi();

const aiInstructions = ref<string>("");
const expectedAnswer = ref<string>("");

const setPrivateFields = (patch: { aiInstructions?: string; expectedAnswer?: string }) => {
	if (patch.aiInstructions !== undefined) aiInstructions.value = patch.aiInstructions;
	if (patch.expectedAnswer !== undefined) expectedAnswer.value = patch.expectedAnswer;

	// Cast is deliberate: the private fields ride along in the PATCH body although the
	// broadcast content type does not declare them (AiQuestionContentBody accepts them).
	modelValue.value = {
		...modelValue.value,
		aiInstructions: aiInstructions.value,
		expectedAnswer: expectedAnswer.value,
	} as AiQuestionElement["content"];
};

const setAllowMultipleAttempts = (value: boolean) => {
	modelValue.value = { ...modelValue.value, allowMultipleAttempts: value };
};

onMounted(async () => {
	const config = await fetchConfig(props.element.id);
	if (!config) {
		return;
	}

	aiInstructions.value = config.aiInstructions ?? "";
	expectedAnswer.value = config.expectedAnswer ?? "";
});
</script>
