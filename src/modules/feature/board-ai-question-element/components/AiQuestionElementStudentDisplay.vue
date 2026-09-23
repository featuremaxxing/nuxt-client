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
			<VAlert
				v-if="submitError"
				type="error"
				variant="tonal"
				density="compact"
				class="mt-2"
				data-testid="ai-question-student-error"
			>
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
			<VChip
				v-if="points !== undefined && maxPoints !== undefined"
				class="mb-2"
				color="primary"
				data-testid="ai-question-student-points"
			>
				{{ t("components.cardElement.aiQuestionElement.points", { points, maxPoints }) }}
			</VChip>
			<VAlert
				v-if="aiFlagged"
				type="warning"
				variant="tonal"
				density="compact"
				class="mb-2"
				data-testid="ai-question-student-ai-flag"
			>
				{{ aiFlagReason || t("components.cardElement.aiQuestionElement.aiFlagged") }}
			</VAlert>
			<VSheet
				color="var(--color-secondary)"
				class="ai-response-sheet pa-3 rounded-lg"
				data-testid="ai-question-student-ai-response"
			>
				<p class="text-sm text-medium-emphasis mb-1">
					{{ t("components.cardElement.aiQuestionElement.aiResponseTitle") }}
				</p>
				<p class="ai-question-text">{{ aiResponse }}</p>
			</VSheet>
			<div class="d-flex flex-wrap align-center ga-2 mt-2">
				<VBtn variant="text" :data-testid="'ai-question-student-flag'" @click="toggleStudentFlag">
					{{
						t(
							studentFlagged
								? "components.cardElement.aiQuestionElement.unflagAssessment"
								: "components.cardElement.aiQuestionElement.flagAssessment"
						)
					}}
				</VBtn>
				<VChip v-if="studentFlagged" size="small" color="warning" data-testid="ai-question-student-flagged">
					{{ t("components.cardElement.aiQuestionElement.flaggedForReview") }}
				</VChip>
			</div>
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
import { AiQuestionAnswerResponse } from "@api-server";
import { useAiQuestionApi } from "@data-ai-question";
import { mdiRobotOutline } from "@icons/material";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: AiQuestionElement;
}>();

const { t } = useI18n();
const { fetchOwnAnswer, setAnswerFlag, submitAnswer } = useAiQuestionApi();

const OWN_ANSWER_POLL_ATTEMPTS = 8;
const OWN_ANSWER_POLL_INTERVAL_MS = 4000;

const answerText = ref<string>("");
const submitting = ref(false);
const submitError = ref(false);
// undefined = no answer to show yet; a string is the AI's latest assessment.
const aiResponse = ref<string | undefined>(undefined);
const attemptCount = ref(0);
const points = ref<number>();
const maxPoints = ref<number>();
const aiFlagged = ref(false);
const aiFlagReason = ref<string>();
const studentFlagged = ref(false);

onMounted(async () => {
	const result = await fetchOwnAnswer(props.element.id);
	const ownAnswer = result?.answer;
	if (ownAnswer) applyAnswer(ownAnswer);
});

const onSubmit = async () => {
	const text = answerText.value.trim();
	if (text === "" || submitting.value) {
		return;
	}

	submitting.value = true;
	submitError.value = false;
	const result = await submitAnswer(props.element.id, { answer: text }, { silent: true });

	if (result === "error") {
		// Self-heal: a proxy timeout during the slow AI call can make the POST fail (e.g.
		// 408) even though the server finishes and stores the answer shortly after. Poll
		// for it briefly before showing an error - the student then sees the assessment
		// as soon as it exists, without clicking again.
		const recovered = await pollForOwnAnswer();
		submitting.value = false;
		if (recovered) {
			return;
		}

		// Inline error, input preserved: the student can retry immediately.
		submitError.value = true;
		return;
	}

	submitting.value = false;
	if (result) applyAnswer(result);
};

const applyAnswer = (answer: AiQuestionAnswerResponse) => {
	aiResponse.value = answer.aiResponse;
	attemptCount.value = answer.attemptCount;
	points.value = answer.points ?? undefined;
	maxPoints.value = answer.maxPoints ?? undefined;
	aiFlagged.value = answer.aiFlagged ?? false;
	aiFlagReason.value = answer.aiFlagReason ?? undefined;
	studentFlagged.value = answer.studentFlagged ?? false;
	answerText.value = "";
	submitError.value = false;
};

const toggleStudentFlag = async () => {
	const result = await setAnswerFlag(props.element.id, !studentFlagged.value);
	if (result) applyAnswer(result);
};

const onResubmit = () => {
	aiResponse.value = undefined;
	submitError.value = false;
};

// The AI assessment usually arrives a few seconds after the connection was cut - keep
// looking for it for ~30 seconds. Returns true once it was found and rendered.
const pollForOwnAnswer = async (): Promise<boolean> => {
	for (let attempt = 0; attempt < OWN_ANSWER_POLL_ATTEMPTS; attempt += 1) {
		const own = await fetchOwnAnswer(props.element.id);
		if (own?.answer) {
			applyAnswer(own.answer);
			return true;
		}

		if (attempt < OWN_ANSWER_POLL_ATTEMPTS - 1) {
			await new Promise((resolve) => setTimeout(resolve, OWN_ANSWER_POLL_INTERVAL_MS));
		}
	}

	return false;
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
