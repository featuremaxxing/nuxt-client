<template>
	<VCardText class="poll-edit">
		<VTextField
			:model-value="modelValue.title"
			:label="t('components.cardElement.pollElement.titleLabel')"
			data-testid="poll-title"
			@update:model-value="(value: string) => (modelValue.title = value)"
		/>

		<div v-for="(question, questionIndex) in modelValue.questions" :key="question.id" class="poll-question-edit">
			<div class="poll-question-edit-header">
				<VTextField
					:model-value="question.text"
					:label="t('components.cardElement.pollElement.questionLabel', { number: questionIndex + 1 })"
					:data-testid="`poll-question-text-${questionIndex}`"
					@update:model-value="(value: string) => (question.text = value)"
				/>
				<VBtn
					icon
					variant="text"
					:disabled="questionIndex === 0"
					:data-testid="`poll-question-move-up-${questionIndex}`"
					@click="moveQuestion(questionIndex, -1)"
				>
					<VIcon :icon="mdiArrowUp" />
				</VBtn>
				<VBtn
					icon
					variant="text"
					:disabled="questionIndex === modelValue.questions.length - 1"
					:data-testid="`poll-question-move-down-${questionIndex}`"
					@click="moveQuestion(questionIndex, 1)"
				>
					<VIcon :icon="mdiArrowDown" />
				</VBtn>
				<VBtn
					icon
					variant="text"
					:disabled="modelValue.questions.length <= 1"
					:data-testid="`poll-question-remove-${questionIndex}`"
					@click="removeQuestion(questionIndex)"
				>
					<VIcon :icon="mdiDelete" />
				</VBtn>
			</div>

			<div class="poll-question-edit-row">
				<VSelect
					:model-value="question.answerMode"
					:items="answerModeItems"
					:label="t('components.cardElement.pollElement.answerModeLabel')"
					:data-testid="`poll-question-answer-mode-${questionIndex}`"
					@update:model-value="(value: PollAnswerMode) => (question.answerMode = value)"
				/>
				<VSelect
					v-if="question.answerMode !== PollAnswerMode.TEXT"
					:model-value="question.chartType"
					:items="chartTypeItems"
					:label="t('components.cardElement.pollElement.chartTypeLabel')"
					:data-testid="`poll-question-chart-type-${questionIndex}`"
					@update:model-value="(value: PollChartType) => (question.chartType = value)"
				/>
			</div>

			<div v-if="question.answerMode !== PollAnswerMode.TEXT" class="poll-options-edit">
				<div v-for="(option, optionIndex) in question.options" :key="option.id" class="poll-option-edit-row">
					<VTextField
						:model-value="option.text"
						:label="t('components.cardElement.pollElement.optionLabel', { number: optionIndex + 1 })"
						:data-testid="`poll-option-text-${questionIndex}-${optionIndex}`"
						@update:model-value="(value: string) => (option.text = value)"
					/>
					<VBtn
						icon
						variant="text"
						:disabled="question.options.length <= MIN_OPTIONS"
						:data-testid="`poll-option-remove-${questionIndex}-${optionIndex}`"
						@click="removeOption(question, optionIndex)"
					>
						<VIcon :icon="mdiDelete" />
					</VBtn>
				</div>
				<VBtn
					variant="text"
					:prepend-icon="mdiPlus"
					:disabled="question.options.length >= MAX_OPTIONS"
					:data-testid="`poll-add-option-${questionIndex}`"
					@click="addOption(question)"
				>
					{{ t("components.cardElement.pollElement.addOption") }}
				</VBtn>
			</div>
		</div>

		<VBtn variant="tonal" class="mt-2" :prepend-icon="mdiPlus" data-testid="poll-add-question" @click="addQuestion">
			{{ t("components.cardElement.pollElement.addQuestion") }}
		</VBtn>

		<VDivider class="my-4" />

		<VSwitch
			:model-value="modelValue.isAnonymous"
			:label="t('components.cardElement.pollElement.anonymous')"
			data-testid="poll-anonymous-toggle"
			@update:model-value="(value: boolean | null) => (modelValue.isAnonymous = !!value)"
		/>
		<VSwitch
			:model-value="modelValue.showResultsLive"
			:label="t('components.cardElement.pollElement.liveResults')"
			data-testid="poll-live-results-toggle"
			@update:model-value="(value: boolean | null) => (modelValue.showResultsLive = !!value)"
		/>

		<VSelect
			:model-value="modelValue.audience"
			:items="audienceItems"
			:label="t('components.cardElement.pollElement.audienceLabel')"
			:disabled="audienceLocked"
			:hint="audienceLocked ? t('components.cardElement.pollElement.audienceLockedHint') : undefined"
			persistent-hint
			data-testid="poll-audience-select"
			@update:model-value="(value: PollAudience) => (modelValue.audience = value)"
		/>

		<div v-if="modelValue.audience === PollAudience.CUSTOM" class="poll-audience-roles">
			<VCheckbox
				v-for="role in audienceRoleItems"
				:key="role.value"
				:model-value="(modelValue.audienceRoles ?? []).includes(role.value)"
				:label="role.title"
				:disabled="audienceLocked"
				density="compact"
				hide-details
				:data-testid="`poll-audience-role-${role.value}`"
				@update:model-value="(checked: boolean | null) => onToggleAudienceRole(role.value, !!checked)"
			/>
		</div>

		<ClosesAtField
			:model-value="modelValue.closesAt ?? undefined"
			@update:model-value="(value?: string) => (modelValue.closesAt = value)"
		/>

		<div class="poll-status-actions mt-2">
			<VBtn
				v-if="modelValue.pollStatus !== PollStatus.OPEN"
				variant="tonal"
				color="primary"
				data-testid="poll-open"
				@click="modelValue.pollStatus = PollStatus.OPEN"
			>
				{{ t("components.cardElement.pollElement.open") }}
			</VBtn>
			<VBtn v-else variant="tonal" data-testid="poll-close" @click="modelValue.pollStatus = PollStatus.CLOSED">
				{{ t("components.cardElement.pollElement.close") }}
			</VBtn>
		</div>
	</VCardText>
</template>

<script setup lang="ts">
import ClosesAtField from "./ClosesAtField.vue";
import { PollElement } from "@/types/board/ContentElement";
import {
	BoardRoles,
	PollAnswerMode,
	PollAudience,
	PollChartType,
	PollOptionResponse,
	PollQuestionResponse,
	PollStatus,
} from "@api-server";
import { useContentElementState } from "@data-board";
import { usePollsStore } from "@data-poll";
import { mdiArrowDown, mdiArrowUp, mdiDelete, mdiPlus } from "@icons/material";
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: PollElement;
	isEditMode: boolean;
}>();

const { t } = useI18n();

const { modelValue } = useContentElementState(props, { autoSaveDebounce: 400 });

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

// The audience is locked once votes exist (see U-R4 / ContentElementUpdateService -
// the server rejects the change with a ConflictException regardless; this is only the
// UX-level heads-up so a teacher doesn't hit that error unexpectedly). Results aren't
// otherwise fetched while editing (see PollContentElement.vue's onMounted), so this
// component fetches them itself to know whether any vote has been cast yet.
const { getState, fetchPollResults } = usePollsStore();
onMounted(() => fetchPollResults(props.element.id));
const audienceLocked = computed(() => getState(props.element.id).totalVotes > 0);

const audienceItems = [
	{ title: t("components.cardElement.pollElement.audience.students"), value: PollAudience.STUDENTS },
	{ title: t("components.cardElement.pollElement.audience.teachers"), value: PollAudience.TEACHERS },
	{ title: t("components.cardElement.pollElement.audience.all"), value: PollAudience.ALL },
	{ title: t("components.cardElement.pollElement.audience.custom"), value: PollAudience.CUSTOM },
];

const audienceRoleItems = [
	{ title: t("components.cardElement.pollElement.audienceRole.reader"), value: BoardRoles.READER },
	{ title: t("components.cardElement.pollElement.audienceRole.editor"), value: BoardRoles.EDITOR },
	{ title: t("components.cardElement.pollElement.audienceRole.admin"), value: BoardRoles.ADMIN },
];

const onToggleAudienceRole = (role: BoardRoles, checked: boolean) => {
	const current = modelValue.value.audienceRoles ?? [];
	modelValue.value.audienceRoles = checked ? [...current, role] : current.filter((r) => r !== role);
};

const answerModeItems = [
	{ title: t("components.cardElement.pollElement.answerMode.single"), value: PollAnswerMode.SINGLE },
	{ title: t("components.cardElement.pollElement.answerMode.multiple"), value: PollAnswerMode.MULTIPLE },
	{ title: t("components.cardElement.pollElement.answerMode.text"), value: PollAnswerMode.TEXT },
];

const chartTypeItems = [
	{ title: t("components.cardElement.pollElement.chartType.bar"), value: PollChartType.BAR },
	{ title: t("components.cardElement.pollElement.chartType.column"), value: PollChartType.COLUMN },
	{ title: t("components.cardElement.pollElement.chartType.donut"), value: PollChartType.DONUT },
	{ title: t("components.cardElement.pollElement.chartType.stacked"), value: PollChartType.STACKED },
];

const newId = () =>
	typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;

const newOption = (): PollOptionResponse => ({ id: newId(), text: "" });

const newQuestion = (): PollQuestionResponse => ({
	id: newId(),
	text: "",
	answerMode: PollAnswerMode.SINGLE,
	chartType: PollChartType.BAR,
	options: [newOption(), newOption()],
});

const addQuestion = () => {
	modelValue.value.questions.push(newQuestion());
};

const removeQuestion = (index: number) => {
	if (modelValue.value.questions.length <= 1) return;
	modelValue.value.questions.splice(index, 1);
};

const moveQuestion = (index: number, direction: -1 | 1) => {
	const targetIndex = index + direction;
	if (targetIndex < 0 || targetIndex >= modelValue.value.questions.length) return;
	const questions = modelValue.value.questions;
	[questions[index], questions[targetIndex]] = [questions[targetIndex], questions[index]];
};

const addOption = (question: PollQuestionResponse) => {
	if (question.options.length >= MAX_OPTIONS) return;
	question.options.push(newOption());
};

const removeOption = (question: PollQuestionResponse, index: number) => {
	if (question.options.length <= MIN_OPTIONS) return;
	question.options.splice(index, 1);
};
</script>

<style scoped lang="scss">
.poll-edit {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.poll-question-edit {
	border: 1px solid rgba(0, 0, 0, 0.12);
	border-radius: 4px;
	padding: 12px;
	margin-bottom: 12px;
}

.poll-question-edit-header {
	display: flex;
	align-items: center;
	gap: 4px;

	> :first-child {
		flex: 1 1 auto;
	}
}

.poll-question-edit-row {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;

	> * {
		flex: 1 1 160px;
	}
}

.poll-options-edit {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.poll-option-edit-row {
	display: flex;
	align-items: center;
	gap: 4px;

	> :first-child {
		flex: 1 1 auto;
	}
}

.poll-status-actions {
	display: flex;
	gap: 8px;
}

.poll-audience-roles {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 16px;
}
</style>
