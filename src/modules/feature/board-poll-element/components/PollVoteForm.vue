<template>
	<VCardText class="poll-vote-form">
		<div v-for="question in element.content.questions" :key="question.id" class="poll-vote-question">
			<p class="poll-vote-question-text">{{ question.text }}</p>

			<VRadioGroup
				v-if="question.answerMode === PollAnswerMode.SINGLE"
				:model-value="singleSelections[question.id]"
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
					hide-details
					:data-testid="`poll-vote-checkbox-${question.id}-${option.id}`"
					@update:model-value="(checked: boolean | null) => toggleOption(question.id, option.id, !!checked)"
				/>
			</div>

			<VTextarea
				v-else
				:model-value="textAnswers[question.id]"
				:label="t('components.cardElement.pollElement.freeTextAnswer')"
				auto-grow
				rows="2"
				:data-testid="`poll-vote-textarea-${question.id}`"
				@update:model-value="(value: string) => (textAnswers[question.id] = value)"
			/>
		</div>

		<VBtn color="primary" data-testid="poll-vote-submit" :disabled="submitting" @click="onSubmit">
			{{ hasExistingAnswers ? t("components.cardElement.pollElement.changeVote") : t("components.cardElement.pollElement.vote") }}
		</VBtn>
	</VCardText>
</template>

<script setup lang="ts">
import { PollElement } from "@/types/board/ContentElement";
import { PollAnswerMode, PollAnswerResponse } from "@api-server";
import { usePollSocketApi, usePollsStore } from "@data-poll";
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: PollElement;
	existingAnswers?: PollAnswerResponse[];
}>();

const emit = defineEmits<{
	(e: "voted"): void;
}>();

const { t } = useI18n();
const { fetchPollResults } = usePollsStore();
const { castVoteViaSocket } = usePollSocketApi();

const hasExistingAnswers = !!props.existingAnswers?.length;
const submitting = ref(false);

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

const onSubmit = async () => {
	submitting.value = true;
	const answers = buildAnswers();
	try {
		// There is no REST vote-casting endpoint - voting only travels over the live board socket
		// (see poll-vote-request/-success in pollActions.ts and PollSocketApi.composable.ts). The
		// socket's poll-vote-success payload never carries the caller's own `myVote` (only
		// aggregate totals, and `results` at that only when showResultsLive is on), so always
		// follow up with a REST fetch to pick up this client's own vote/participant count.
		castVoteViaSocket({ elementId: props.element.id, answers });
		await fetchPollResults(props.element.id);
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
