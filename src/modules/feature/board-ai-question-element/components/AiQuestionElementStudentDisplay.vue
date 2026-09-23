<template>
	<VCardText data-testid="ai-question-element-student">
		<p class="ai-question-text mb-3" data-testid="ai-question-student-question">
			{{ element.content.question }}
		</p>

		<template v-if="aiResponse === undefined">
			<VTextarea
				v-model="answerText"
				:label="t('components.cardElement.aiQuestionElement.yourAnswer')"
				:placeholder="t('components.cardElement.aiQuestionElement.answerPlaceholder')"
				variant="outlined"
				rows="3"
				auto-grow
				:disabled="submitting"
				data-testid="ai-question-student-answer"
			/>
			<div class="d-flex align-center">
				<VBtn
					color="primary"
					variant="flat"
					:loading="submitting"
					:disabled="answerText.trim() === ''"
					data-testid="ai-question-student-submit"
					@click="onSubmit"
				>
					{{ t("components.cardElement.aiQuestionElement.submit") }}
				</VBtn>
				<span v-if="submitting" class="text-sm ml-3">
					{{ t("components.cardElement.aiQuestionElement.aiThinking") }}
				</span>
			</div>
			<VAlert v-if="submitError" type="error" variant="tonal" density="compact" class="mt-2" data-testid="ai-question-student-error">
				{{ t("components.cardElement.aiQuestionElement.aiError") }}
			</VAlert>
		</template>

		<template v-else>
			<div class="d-flex align-center mb-1" data-testid="ai-question-student-attempt">
				<VIcon :icon="mdiRobotOutline" size="small" class="mr-1" />
				<span class="text-sm text-medium-emphasis">
					{{ t("components.cardElement.aiQuestionElement.attempt", { count: attemptCount }) }}
				</span>
			</div>
			<VSheet color="var(--color-secondary)" class="ai-response-sheet pa-3 rounded-lg" data-testid="ai-question-student-ai-response">
				<p class="text-sm text-medium-emphasis mb-1">{{ t("components.cardElement.aiQuestionElement.aiResponseTitle") }}</p>
				<p class="ai-question-text">{{ aiResponse }}</p>
			</VSheet>
			<VBtn
				v-if="element.content.allowMultipleAttempts"
				variant="text"
				class="mt-2"
				data-testid="ai-question-student-resubmit"
				@click="onResubmit"
			>
				{{ t("components.cardElement.aiQuestionElement.resubmit") }}
			</VBtn>
		</template>
	</VCardText>
</template>

<script setup lang="ts">
import { AiQuestionElement } from "@/types/board/ContentElement";
import { useAiQuestionApi } from "@data-ai-question";
import { mdiRobotOutline } from "@icons/material";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: AiQuestionElement;
}>();

const { t } = useI18n();
const { fetchOwnAnswer, submitAnswer } = useAiQuestionApi();

const answerText = ref<string>("");
const submitting = ref(false);
const submitError = ref(false);
// undefined = no answer to show yet; a string is the AI's latest assessment.
const aiResponse = ref<string | undefined>(undefined);
const attemptCount = ref(0);

onMounted(async () => {
	const result = await fetchOwnAnswer(props.element.id);
	const ownAnswer = result?.answer;
	if (ownAnswer) {
		aiResponse.value = ownAnswer.aiResponse;
		attemptCount.value = ownAnswer.attemptCount;
	}
});

const onSubmit = async () => {
	const text = answerText.value.trim();
	if (text === "" || submitting.value) {
		return;
	}

	submitting.value = true;
	submitError.value = false;
	const result = await submitAnswer(props.element.id, { answer: text }, { silent: true });
	submitting.value = false;

	if (result === "error") {
		// Self-heal: a proxy timeout during the slow AI call can make the POST fail even
		// though the server stored the answer afterwards. Re-fetch before showing an
		// error - if an answer appeared in the meantime, display it instead.
		const own = await fetchOwnAnswer(props.element.id);
		if (own?.answer) {
			aiResponse.value = own.answer.aiResponse;
			attemptCount.value = own.answer.attemptCount;
			answerText.value = "";
			return;
		}

		// Inline error, input preserved: the student can retry immediately.
		submitError.value = true;
		return;
	}

	if (result) {
		aiResponse.value = result.aiResponse;
		attemptCount.value = result.attemptCount;
		answerText.value = "";
	}
};

const onResubmit = () => {
	aiResponse.value = undefined;
	submitError.value = false;
};
</script>

<style scoped>
/* Theme text-scale variables: the fullscreen card detail view overrides --text-sm/md,
   so both card and detail view scale correctly without separate layouts. */
.ai-question-text {
	font-size: var(--text-md);
	line-height: 1.5;
	white-space: pre-wrap;
	width: 100%;
}

.ai-response-sheet {
	width: 100%;
}
</style>
