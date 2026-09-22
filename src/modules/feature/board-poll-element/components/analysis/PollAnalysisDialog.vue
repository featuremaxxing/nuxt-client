<template>
	<VDialog
		:model-value="modelValue"
		fullscreen
		scrollable
		:transition="false"
		data-testid="poll-analysis-dialog"
		@keydown.escape="close"
	>
		<VCard class="poll-analysis-card">
			<VToolbar class="poll-analysis-toolbar border-b-thin">
				<VBtn
					:icon="mdiClose"
					data-testid="poll-analysis-close"
					:aria-label="t('components.cardElement.pollElement.closeAnalysis')"
					@click="close"
				/>
				<VToolbarTitle>{{ element.content.title || t("components.cardElement.pollElement") }}</VToolbarTitle>
				<VBtn
					:icon="mdiChevronLeft"
					data-testid="poll-analysis-prev"
					:aria-label="t('components.cardElement.pollElement.previousQuestion')"
					:disabled="!canGoPrev"
					@click="goToOffset(-1)"
				/>
				<VBtn
					:icon="mdiChevronRight"
					data-testid="poll-analysis-next"
					:aria-label="t('components.cardElement.pollElement.nextQuestion')"
					:disabled="!canGoNext"
					@click="goToOffset(1)"
				/>
			</VToolbar>

			<VCardText class="poll-analysis-body">
				<PollAnalysisNavList
					class="poll-analysis-nav"
					:entries="entries"
					:selected-id="selectedId"
					:questions-by-id="questionsById"
					@select="selectedId = $event"
				/>

				<div class="poll-analysis-main" data-testid="poll-analysis-main">
					<template v-if="selectedEntry?.type === 'overview'">
						<div class="poll-analysis-overview-grid">
							<div v-for="question in element.content.questions" :key="question.id" class="poll-analysis-overview-item">
								<p class="poll-analysis-question-text">{{ question.text }}</p>
								<template v-if="question.answerMode === PollAnswerMode.TEXT">
									<ul v-if="textAnswersFor(question.id).length > 0" class="poll-analysis-text-answers">
										<li v-for="(answer, index) in textAnswersFor(question.id).slice(0, 3)" :key="index">
											{{ answer }}
										</li>
									</ul>
									<p v-else class="poll-analysis-empty">
										{{ t("components.cardElement.pollElement.emptyResults") }}
									</p>
								</template>
								<PollChart
									v-else
									:data="chartDataFor(question)"
									:chart-type="question.chartType"
									:element-id="`${element.id}-overview`"
									:question-id="question.id"
									:width="280"
									:height="160"
								/>
							</div>
						</div>
					</template>

					<template v-else-if="selectedEntry?.type === 'question'">
						<div v-if="selectedQuestion" class="poll-analysis-question-large">
							<p class="poll-analysis-question-text">{{ selectedQuestion.text }}</p>
							<template v-if="selectedQuestion.answerMode === PollAnswerMode.TEXT">
								<ul
									v-if="textAnswersFor(selectedQuestion.id).length > 0"
									class="poll-analysis-text-answers poll-analysis-text-answers-large"
								>
									<li v-for="(answer, index) in textAnswersFor(selectedQuestion.id)" :key="index">
										{{ answer }}
									</li>
								</ul>
								<p v-else class="poll-analysis-empty">
									{{ t("components.cardElement.pollElement.emptyResults") }}
								</p>
							</template>
							<PollChart
								v-else
								:data="chartDataFor(selectedQuestion)"
								:chart-type="selectedQuestion.chartType"
								:element-id="`${element.id}-detail`"
								:question-id="selectedQuestion.id"
								:width="880"
								:height="480"
							/>
						</div>
					</template>

					<template v-else-if="selectedEntry?.type === 'participants'">
						<PollParticipantsTable :questions="element.content.questions" :voters="participants" />
					</template>
				</div>
			</VCardText>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import {
	AnalysisEntry,
	AnalysisEntryId,
	buildAnalysisEntries,
	entryIdAtOffset,
	findEntryIndex,
} from "../../poll-analysis.util";
import { ChartDatum } from "../../poll-chart.util";
import PollChart from "../charts/PollChart.vue";
import PollAnalysisNavList from "./PollAnalysisNavList.vue";
import PollParticipantsTable from "./PollParticipantsTable.vue";
import { PollElement } from "@/types/board/ContentElement";
import { PollAnswerMode, PollQuestionResponse, PollVoterResponse } from "@api-server";
import { usePollsStore } from "@data-poll";
import { mdiChevronLeft, mdiChevronRight, mdiClose } from "@icons/material";
import { onKeyStroke } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	modelValue: boolean;
	element: PollElement;
	isEditor: boolean;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void;
}>();

const { t } = useI18n();
const { getState } = usePollsStore();

// Read from the shared poll store directly (not static props copied in at open-time) so
// socket-driven live vote updates keep this dialog's charts current while it's open.
const pollState = computed(() => getState(props.element.id));

// Second line of defense against a student ever seeing participant data: only ever expose voters
// here when isEditor AND the poll isn't anonymous. The server already never sends `voters` to
// non-managers, so this should always agree with `pollState.value.voters`, but the dialog never
// trusts that alone.
const participants = computed<PollVoterResponse[]>(() => {
	if (!props.isEditor || props.element.content.isAnonymous) return [];
	return pollState.value.voters ?? [];
});

const questionsById = computed<Record<string, PollQuestionResponse>>(() => {
	const map: Record<string, PollQuestionResponse> = {};
	props.element.content.questions.forEach((question) => {
		map[question.id] = question;
	});
	return map;
});

const entries = computed<AnalysisEntry[]>(() =>
	buildAnalysisEntries({
		questionIds: props.element.content.questions.map((question) => question.id),
		isEditor: props.isEditor,
		isAnonymous: props.element.content.isAnonymous,
		hasVoters: pollState.value.voters !== undefined,
	})
);

const selectedId = ref<AnalysisEntryId>("overview");

// If the currently selected entry ever disappears from the recomputed list (defensive - question
// ids are effectively stable in practice, but this must never leave selection dangling on a
// nonexistent id), fall back to "overview" rather than staying on an id nothing displays for.
watch(entries, (newEntries) => {
	if (findEntryIndex(newEntries, selectedId.value) === -1) {
		selectedId.value = "overview";
	}
});

const selectedEntry = computed<AnalysisEntry | undefined>(() =>
	entries.value.find((entry) => entry.id === selectedId.value)
);
const selectedQuestion = computed<PollQuestionResponse | undefined>(() => {
	const entry = selectedEntry.value;
	if (!entry || entry.type !== "question") return undefined;
	return questionsById.value[entry.questionId];
});

const goToOffset = (delta: number) => {
	const nextId = entryIdAtOffset(entries.value, selectedId.value, delta);
	if (nextId !== undefined) {
		selectedId.value = nextId;
	}
};

const canGoPrev = computed(() => entryIdAtOffset(entries.value, selectedId.value, -1) !== undefined);
const canGoNext = computed(() => entryIdAtOffset(entries.value, selectedId.value, 1) !== undefined);

const EDITABLE_TAG_NAMES = new Set(["INPUT", "TEXTAREA"]);
const isTypingTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) return false;
	return EDITABLE_TAG_NAMES.has(target.tagName) || target.isContentEditable;
};

onKeyStroke(
	["ArrowLeft", "ArrowRight"],
	(event) => {
		if (!props.modelValue) return;
		if (isTypingTarget(event.target)) return;
		goToOffset(event.key === "ArrowLeft" ? -1 : 1);
	},
	{ eventName: "keydown" }
);

const close = () => emit("update:modelValue", false);

const snapshotFor = (questionId: string) => pollState.value.results?.find((entry) => entry.questionId === questionId);

const chartDataFor = (question: PollQuestionResponse): ChartDatum[] => {
	const snapshot = snapshotFor(question.id);
	return question.options.map((option) => ({
		label: option.text,
		value: snapshot?.counts.find((entry) => entry.optionId === option.id)?.count ?? 0,
	}));
};

const textAnswersFor = (questionId: string): string[] => snapshotFor(questionId)?.textAnswers ?? [];
</script>

<style scoped lang="scss">
.poll-analysis-card {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.poll-analysis-toolbar {
	position: sticky;
	top: 0;
	z-index: 1;
}

.poll-analysis-body {
	display: flex;
	gap: 24px;
	align-items: flex-start;
	height: 100%;
}

.poll-analysis-nav {
	width: 260px;
	flex-shrink: 0;
}

.poll-analysis-main {
	flex: 1;
	min-width: 0;
}

.poll-analysis-overview-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 24px;
}

.poll-analysis-overview-item {
	min-width: 280px;
}

.poll-analysis-question-text {
	font-weight: 600;
	margin-bottom: 8px;
}

.poll-analysis-text-answers {
	margin: 0;
	padding-left: 20px;
}

.poll-analysis-text-answers-large {
	font-size: 1.1rem;
}

.poll-analysis-empty {
	font-style: italic;
	opacity: 0.7;
}
</style>
