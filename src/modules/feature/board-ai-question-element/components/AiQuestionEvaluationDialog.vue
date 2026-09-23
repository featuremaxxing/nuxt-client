<template>
	<VDialog
		:model-value="modelValue"
		fullscreen
		scrollable
		:transition="false"
		data-testid="ai-question-evaluation-dialog"
		@keydown.escape="close"
	>
		<VCard class="evaluation-card">
			<VToolbar class="border-b-thin">
				<VBtn
					:icon="mdiClose"
					:aria-label="t('common.labels.close')"
					data-testid="ai-question-evaluation-close"
					@click="close"
				/>
				<VToolbarTitle>{{ t("components.cardElement.aiQuestionElement.evaluation") }}</VToolbarTitle>
			</VToolbar>
			<VCardText class="evaluation-body">
				<div class="evaluation-list">
					<div class="d-flex flex-wrap ga-2 mb-3">
						<VChip>{{ t("components.cardElement.aiQuestionElement.answersCount", { count: answers.length }) }}</VChip>
						<VChip v-if="gradedCount" color="primary">{{
							t("components.cardElement.aiQuestionElement.gradedCount", { count: gradedCount })
						}}</VChip>
						<VChip v-if="flaggedCount" color="warning">{{
							t("components.cardElement.aiQuestionElement.flaggedCount", { count: flaggedCount })
						}}</VChip>
					</div>
					<VTextField
						v-model="search"
						density="compact"
						clearable
						:label="t('common.labels.search')"
						:prepend-inner-icon="mdiMagnify"
					/>
					<VList lines="two" data-testid="ai-question-evaluation-list">
						<VListItem
							v-for="entry in filteredAnswers"
							:key="entry.id"
							:active="entry.id === selectedId"
							:data-testid="`ai-question-evaluation-entry-${entry.id}`"
							@click="selectedId = entry.id"
						>
							<VListItemTitle>{{ displayName(entry) }}</VListItemTitle>
							<VListItemSubtitle>
								<span v-if="entry.points != null">{{
									t("components.cardElement.aiQuestionElement.points", {
										points: entry.points,
										maxPoints: entry.maxPoints,
									})
								}}</span>
								<span v-else>{{ t("components.cardElement.aiQuestionElement.noPoints") }}</span>
							</VListItemSubtitle>
							<template #append>
								<VIcon v-if="entry.aiFlagged || entry.studentFlagged" :icon="mdiFlag" color="warning" />
							</template>
						</VListItem>
					</VList>
				</div>

				<div class="evaluation-detail" data-testid="ai-question-evaluation-detail">
					<template v-if="selected">
						<h2 class="text-h2 mb-2">{{ displayName(selected) }}</h2>
						<div class="d-flex flex-wrap ga-2 mb-4">
							<VChip v-if="selected.points != null" color="primary">
								{{
									t("components.cardElement.aiQuestionElement.points", {
										points: selected.points,
										maxPoints: selected.maxPoints,
									})
								}}
							</VChip>
							<VChip>{{
								t("components.cardElement.aiQuestionElement.attempt", { count: selected.attemptCount })
							}}</VChip>
							<VChip v-if="selected.aiFlagged" color="warning" :prepend-icon="mdiFlag">{{
								t("components.cardElement.aiQuestionElement.aiFlagged")
							}}</VChip>
							<VChip v-if="selected.studentFlagged" color="warning" :prepend-icon="mdiFlag">{{
								t("components.cardElement.aiQuestionElement.studentFlagged")
							}}</VChip>
						</div>
						<VAlert v-if="selected.aiFlagged" type="warning" variant="tonal" class="mb-4">
							{{ selected.aiFlagReason || t("components.cardElement.aiQuestionElement.aiFlagged") }}
						</VAlert>
						<h3 class="text-h3 mb-1">{{ t("components.cardElement.aiQuestionElement.studentAnswer") }}</h3>
						<p class="answer-text mb-5">{{ selected.answer }}</p>
						<h3 class="text-h3 mb-1">{{ t("components.cardElement.aiQuestionElement.aiResponseTitle") }}</h3>
						<p class="answer-text">{{ selected.aiResponse }}</p>
					</template>
					<VEmptyState v-else :title="t('components.cardElement.aiQuestionElement.selectAnswer')" />
				</div>
			</VCardText>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import { AiQuestionAnswerTeacherResponse } from "@api-server";
import { mdiClose, mdiFlag, mdiMagnify } from "@icons/material";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{ modelValue: boolean; answers: AiQuestionAnswerTeacherResponse[] }>();
const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();
const { t } = useI18n();
const search = ref("");
const selectedId = ref<string>();

watch(
	() => [props.modelValue, props.answers] as const,
	() => {
		if (props.modelValue && !props.answers.some((entry) => entry.id === selectedId.value)) {
			selectedId.value = props.answers[0]?.id;
		}
	},
	{ immediate: true }
);

const displayName = (entry: AiQuestionAnswerTeacherResponse) =>
	[entry.firstName, entry.lastName].filter(Boolean).join(" ") || entry.userId;
const filteredAnswers = computed(() => {
	const query = search.value.trim().toLocaleLowerCase();
	return [...props.answers]
		.filter((entry) => !query || displayName(entry).toLocaleLowerCase().includes(query))
		.sort(
			(a, b) =>
				Number(b.studentFlagged || b.aiFlagged) - Number(a.studentFlagged || a.aiFlagged) ||
				displayName(a).localeCompare(displayName(b))
		);
});
const selected = computed(() => props.answers.find((entry) => entry.id === selectedId.value));
const gradedCount = computed(() => props.answers.filter((entry) => entry.points != null).length);
const flaggedCount = computed(() => props.answers.filter((entry) => entry.aiFlagged || entry.studentFlagged).length);
const close = () => emit("update:modelValue", false);
</script>

<style scoped lang="scss">
.evaluation-card {
	display: flex;
	flex-direction: column;
	height: 100%;
}
.evaluation-body {
	display: grid;
	grid-template-columns: minmax(280px, 35%) 1fr;
	gap: 24px;
	height: 100%;
}
.evaluation-list {
	border-right: 1px solid rgb(var(--v-border-color));
	padding-right: 16px;
	overflow-y: auto;
}
.evaluation-detail {
	min-width: 0;
	overflow-y: auto;
}
.answer-text {
	white-space: pre-wrap;
}
@media (max-width: 700px) {
	.evaluation-body {
		grid-template-columns: 1fr;
	}
	.evaluation-list {
		border-right: 0;
	}
}
</style>
