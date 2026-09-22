<template>
	<VCardText class="poll-vote-form">
		<div v-for="question in element.content.questions" :key="question.id" class="poll-vote-question">
			<p class="poll-vote-question-text">
				{{ question.text }}
				<VChip v-if="isLocked(question.id)" size="x-small" variant="outlined" class="ml-1">
					{{ t("components.cardElement.pollElement.answerLocked") }}
				</VChip>
				<VChip v-else-if="isNewQuestion(question.id)" size="x-small" color="primary" variant="flat" class="ml-1">
					{{ t("components.cardElement.pollElement.newQuestions") }}
				</VChip>
			</p>

			<VRadioGroup
				v-if="question.answerMode === PollAnswerMode.SINGLE"
				:model-value="singleSelections[question.id]"
				:disabled="isLocked(question.id)"
				:data-testid="`poll-vote-radio-group-${question.id}`"
				hide-details
				@update:model-value="(value: string | null) => (singleSelections[question.id] = value ?? undefined)"
			>
				<VRadio v-for="option in question.options" :key="option.id" :label="option.text" :value="option.id" />
			</VRadioGroup>

			<div v-else-if="question.answerMode === PollAnswerMode.MULTIPLE" class="poll-vote-checkboxes">
				<VCheckbox
					v-for="option in question.options"
					:key="option.id"
					:model-value="isChecked(question.id, option.id)"
					:label="option.text"
					:disabled="isLocked(question.id)"
					hide-details
					:data-testid="`poll-vote-checkbox-${question.id}-${option.id}`"
					@update:model-value="(checked: boolean | null) => toggleOption(question.id, option.id, !!checked)"
				/>
			</div>

			<VTextarea
				v-else
				:model-value="textAnswers[question.id]"
				:label="t('components.cardElement.pollElement.freeTextAnswer')"
				:disabled="isLocked(question.id)"
				auto-grow
				rows="2"
				:data-testid="`poll-vote-textarea-${question.id}`"
				@update:model-value="(value: string) => (textAnswers[question.id] = value)"
			/>
		</div>

		<VBtn
			color="primary"
			data-testid="poll-vote-submit"
			:disabled="submitting || !hasEditableQuestion"
			@click="onSubmit"
		>
			{{
				hasExistingAnswers
					? t("components.cardElement.pollElement.changeVote")
					: t("components.cardElement.pollElement.vote")
			}}
		</VBtn>
	</VCardText>
</template>

<script setup lang="ts">
import { PollElement } from "@/types/board/ContentElement";
import { PollAnswerMode, PollAnswerResponse } from "@api-server";
import { usePollSocketApi, usePollsStore } from "@data-poll";
import { computed, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: PollElement;
	existingAnswers?: PollAnswerResponse[];
}>();

const emit = defineEmits<{
	(e: "voted"): void;
}>();

const { t } = useI18n();
const { applyOwnVote } = usePollsStore();
const { castVoteViaSocket } = usePollSocketApi();

const hasExistingAnswers = !!props.existingAnswers?.length;
const submitting = ref(false);

// Whether an answer actually holds a choice/text - mirrors the server's
// isAnsweredPollQuestion (poll-answer.ts) so both sides agree on what "answered" means.
const isAnswered = (answer?: PollAnswerResponse): boolean =>
	!!answer && (answer.selectedOptionIds.length > 0 || !!answer.textAnswer?.trim());

const existingAnswerFor = (questionId: string) =>
	props.existingAnswers?.find((answer) => answer.questionId === questionId);

// A question stays locked once it's been answered, unless the poll explicitly allows
// changing answers - the server enforces the same rule (mergePollAnswers), this only keeps
// the form from inviting an edit that would just be silently dropped, or - on the very last
// remaining locked question in an otherwise-unchanged submission - rejected outright.
const isLocked = (questionId: string): boolean =>
	!props.element.content.allowVoteChange && isAnswered(existingAnswerFor(questionId));

// A question with no entry at all in existingAnswers (as opposed to one that exists but was
// left blank) was added to the poll after this person's last submission - marked distinctly
// so a returning voter notices what's new without having to compare against their memory.
const isNewQuestion = (questionId: string): boolean => !existingAnswerFor(questionId);

const hasEditableQuestion = computed(() => props.element.content.questions.some((question) => !isLocked(question.id)));

const singleSelections = reactive<Record<string, string | undefined>>({});
const multipleSelections = reactive<Record<string, string[]>>({});
const textAnswers = reactive<Record<string, string>>({});

const initFromExisting = () => {
	(props.existingAnswers ?? []).forEach((answer) => {
		const question = props.element.content.questions.find((q) => q.id === answer.questionId);
		if (!question) return;

		if (question.answerMode === PollAnswerMode.SINGLE) {
			singleSelections[question.id] = answer.selectedOptionIds[0];
		} else if (question.answerMode === PollAnswerMode.MULTIPLE) {
			multipleSelections[question.id] = [...answer.selectedOptionIds];
		} else {
			textAnswers[question.id] = answer.textAnswer ?? "";
		}
	});
};
initFromExisting();

const isChecked = (questionId: string, optionId: string) => (multipleSelections[questionId] ?? []).includes(optionId);

const toggleOption = (questionId: string, optionId: string, checked: boolean) => {
	const current = multipleSelections[questionId] ?? [];
	multipleSelections[questionId] = checked ? [...current, optionId] : current.filter((id) => id !== optionId);
};

const buildAnswers = (): PollAnswerResponse[] =>
	props.element.content.questions.map((question) => {
		if (question.answerMode === PollAnswerMode.SINGLE) {
			const selected = singleSelections[question.id];
			return { questionId: question.id, selectedOptionIds: selected ? [selected] : [] };
		}
		if (question.answerMode === PollAnswerMode.MULTIPLE) {
			return { questionId: question.id, selectedOptionIds: multipleSelections[question.id] ?? [] };
		}
		return { questionId: question.id, selectedOptionIds: [], textAnswer: textAnswers[question.id] ?? "" };
	});

const onSubmit = () => {
	submitting.value = true;
	const answers = buildAnswers();
	try {
		// There is no REST vote-casting endpoint - voting only travels over the live board socket
		// (see poll-vote-request/-success in pollActions.ts and PollSocketApi.composable.ts), which
		// is fire-and-forget. The vote was just constructed right here, so applying it to the local
		// store immediately (rather than waiting for the socket round-trip, or worse, racing it
		// against a REST re-fetch - see applyOwnVote in polls.ts) is what actually makes this
		// synchronous from the voter's point of view: hasVoted flips true in the same tick.
		castVoteViaSocket({ elementId: props.element.id, answers });
		applyOwnVote(props.element.id, answers);
		emit("voted");
	} finally {
		submitting.value = false;
	}
};
</script>

<style scoped lang="scss">
.poll-vote-form {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.poll-vote-question-text {
	font-weight: 600;
	margin-bottom: 4px;
}

.poll-vote-checkboxes {
	display: flex;
	flex-direction: column;
}
</style>
