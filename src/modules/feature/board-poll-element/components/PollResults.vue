<template>
	<VCardText class="poll-results">
		<div v-for="question in element.content.questions" :key="question.id" class="poll-results-question">
			<p class="poll-results-question-text">{{ question.text }}</p>

			<template v-if="question.answerMode === PollAnswerMode.TEXT">
				<ul v-if="textAnswersFor(question.id).length > 0" class="poll-results-text-answers">
					<li v-for="(answer, index) in textAnswersFor(question.id)" :key="index">{{ answer }}</li>
				</ul>
				<p v-else class="poll-results-empty">{{ t("components.cardElement.pollElement.emptyResults") }}</p>
			</template>

			<template v-else>
				<PollChart
					:data="chartDataFor(question)"
					:chart-type="question.chartType"
					:element-id="element.id"
					:question-id="question.id"
				/>

				<VExpansionPanels v-if="isEditor && !element.content.isAnonymous && voters" class="mt-2">
					<VExpansionPanel v-for="option in question.options" :key="option.id">
						<VExpansionPanelTitle :data-testid="`poll-voter-list-toggle-${question.id}-${option.id}`">
							{{ option.text }} ({{ votersFor(question.id, option.id).length }})
						</VExpansionPanelTitle>
						<VExpansionPanelText>
							<ul>
								<li v-for="voter in votersFor(question.id, option.id)" :key="voter.userId">
									{{ voterName(voter) }}
								</li>
							</ul>
						</VExpansionPanelText>
					</VExpansionPanel>
				</VExpansionPanels>
			</template>
		</div>
	</VCardText>
</template>

<script setup lang="ts">
import { ChartDatum } from "../poll-chart.util";
import { formatVoterName } from "../poll-voter.util";
import PollChart from "./charts/PollChart.vue";
import { PollElement } from "@/types/board/ContentElement";
import { PollAnswerMode, PollQuestionResponse, PollQuestionResultResponse, PollVoterResponse } from "@api-server";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: PollElement;
	results?: PollQuestionResultResponse[];
	voters?: PollVoterResponse[];
	isEditor: boolean;
}>();

const { t } = useI18n();

const snapshotFor = (questionId: string) => props.results?.find((entry) => entry.questionId === questionId);

const chartDataFor = (question: PollQuestionResponse): ChartDatum[] => {
	const snapshot = snapshotFor(question.id);
	return question.options.map((option) => ({
		label: option.text,
		value: snapshot?.counts.find((entry) => entry.optionId === option.id)?.count ?? 0,
	}));
};

const textAnswersFor = (questionId: string): string[] => snapshotFor(questionId)?.textAnswers ?? [];

const votersFor = (questionId: string, optionId: string): PollVoterResponse[] =>
	(props.voters ?? []).filter((voter) =>
		voter.answers.some((answer) => answer.questionId === questionId && answer.selectedOptionIds.includes(optionId))
	);

const voterName = (voter: PollVoterResponse): string =>
	formatVoterName(voter, t("components.cardElement.pollElement.unknownUser"));
</script>

<style scoped lang="scss">
.poll-results {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.poll-results-question-text {
	font-weight: 600;
	margin-bottom: 4px;
}

.poll-results-text-answers {
	margin: 8px 0 0;
	padding-left: 20px;
}

.poll-results-empty {
	font-style: italic;
	opacity: 0.7;
}
</style>
