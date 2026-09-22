<template>
	<VTable v-if="voters.length > 0" data-testid="poll-participants-table" class="poll-participants-table">
		<thead>
			<tr>
				<th scope="col">{{ t("components.cardElement.pollElement.nameColumn") }}</th>
				<th v-for="question in questions" :key="question.id" scope="col" :title="question.text">
					{{ truncateLabel(question.text, 160, 12) }}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="voter in voters" :key="voter.userId" data-testid="poll-participant-row">
				<td data-testid="poll-participant-name">{{ nameFor(voter) }}</td>
				<td v-for="question in questions" :key="question.id" class="poll-participants-answer-cell">
					{{ answerFor(voter, question) }}
				</td>
			</tr>
		</tbody>
	</VTable>

	<p v-else class="poll-participants-empty" data-testid="poll-participants-empty">
		{{ t("components.cardElement.pollElement.noParticipants") }}
	</p>
</template>

<script setup lang="ts">
import { truncateLabel } from "../../poll-chart.util";
import { formatVoterName } from "../../poll-voter.util";
import { PollAnswerMode, PollQuestionResponse, PollVoterResponse } from "@api-server";
import { useI18n } from "vue-i18n";

defineProps<{
	questions: PollQuestionResponse[];
	voters: PollVoterResponse[];
}>();

const { t } = useI18n();

const nameFor = (voter: PollVoterResponse): string =>
	formatVoterName(voter, t("components.cardElement.pollElement.unknownUser"));

const answerFor = (voter: PollVoterResponse, question: PollQuestionResponse): string => {
	const answer = voter.answers.find((entry) => entry.questionId === question.id);
	if (!answer) return "–";

	if (question.answerMode === PollAnswerMode.TEXT) {
		return answer.textAnswer && answer.textAnswer.length > 0 ? answer.textAnswer : "–";
	}

	if (!answer.selectedOptionIds || answer.selectedOptionIds.length === 0) return "–";

	const texts = answer.selectedOptionIds.map(
		(optionId) => question.options.find((option) => option.id === optionId)?.text ?? optionId
	);
	return texts.join(", ");
};
</script>

<style scoped lang="scss">
.poll-participants-answer-cell {
	white-space: pre-wrap;
}

.poll-participants-empty {
	font-style: italic;
	opacity: 0.7;
}
</style>
