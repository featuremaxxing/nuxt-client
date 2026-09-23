<template>
	<VCardText data-testid="ai-question-element-teacher">
		<p class="ai-question-text mb-3" data-testid="ai-question-teacher-question">
			{{ element.content.question }}
		</p>

		<VBtn
			variant="tonal"
			size="small"
			class="mb-3"
			data-testid="ai-question-open-evaluation"
			@click="evaluationOpen = true"
		>
			{{ t("components.cardElement.aiQuestionElement.openEvaluation") }}
		</VBtn>

		<VExpansionPanels v-model="openPanels" multiple variant="accordion" data-testid="ai-question-teacher-answers">
			<VExpansionPanel :value="ANSWERS_PANEL">
				<VExpansionPanelTitle data-testid="ai-question-teacher-answers-toggle">
					{{ t("components.cardElement.aiQuestionElement.answersCount", { count: answers.length }) }}
				</VExpansionPanelTitle>
				<VExpansionPanelText>
					<p
						v-if="answers.length === 0"
						class="text-sm text-medium-emphasis"
						data-testid="ai-question-teacher-answers-empty"
					>
						{{ t("components.cardElement.aiQuestionElement.answersEmpty") }}
					</p>
					<div
						v-for="entry in answers"
						:key="entry.id"
						class="answer-entry py-2"
						:data-testid="`ai-question-teacher-answer-${entry.id}`"
					>
						<div class="d-flex align-center flex-wrap">
							<span class="font-weight-medium">
								{{ [entry.firstName, entry.lastName].filter(Boolean).join(" ") || entry.userId }}
							</span>
							<VChip size="x-small" class="ml-2" data-testid="ai-question-teacher-attempts">
								{{ t("components.cardElement.aiQuestionElement.attempt", { count: entry.attemptCount }) }}
							</VChip>
							<VChip v-if="entry.points != null" size="x-small" class="ml-2" color="primary">
								{{
									t("components.cardElement.aiQuestionElement.points", {
										points: entry.points,
										maxPoints: entry.maxPoints,
									})
								}}
							</VChip>
							<VChip v-if="entry.aiFlagged || entry.studentFlagged" size="x-small" class="ml-2" color="warning">
								{{ t("components.cardElement.aiQuestionElement.flaggedForReview") }}
							</VChip>
						</div>
						<p class="text-sm text-medium-emphasis my-1 answer-text">{{ entry.answer }}</p>
						<VSheet color="var(--color-secondary)" class="pa-2 rounded-md">
							<p class="text-sm text-medium-emphasis mb-1">
								{{ t("components.cardElement.aiQuestionElement.aiResponseTitle") }}
							</p>
							<p class="text-sm answer-text">{{ entry.aiResponse }}</p>
						</VSheet>
					</div>
				</VExpansionPanelText>
			</VExpansionPanel>
		</VExpansionPanels>
		<AiQuestionEvaluationDialog v-model="evaluationOpen" :answers="answers" />
	</VCardText>
</template>

<script setup lang="ts">
import AiQuestionEvaluationDialog from "./AiQuestionEvaluationDialog.vue";
import { AiQuestionElement } from "@/types/board/ContentElement";
import { AiQuestionAnswerTeacherResponse } from "@api-server";
import { useAiQuestionApi } from "@data-ai-question";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: AiQuestionElement;
}>();

const { t } = useI18n();
const { fetchAnswers } = useAiQuestionApi();

const ANSWERS_PANEL = "answers";
const openPanels = ref<string[]>([]);
const evaluationOpen = ref(false);
const answers = ref<AiQuestionAnswerTeacherResponse[]>([]);

onMounted(async () => {
	const result = await fetchAnswers(props.element.id);
	if (result) {
		answers.value = result.answers;
	}
});

// Text-scale variables keep card view and fullscreen detail view in sync.
</script>

<style scoped>
.ai-question-text {
	font-size: var(--text-md);
	line-height: 1.5;
	white-space: pre-wrap;
	width: 100%;
}

.answer-text {
	white-space: pre-wrap;
	width: 100%;
}
</style>
