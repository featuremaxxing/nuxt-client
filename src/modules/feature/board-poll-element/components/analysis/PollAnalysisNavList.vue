<template>
	<VList data-testid="poll-analysis-nav-list" nav>
		<VListItem
			v-for="entry in entries"
			:key="entry.id"
			:data-testid="`poll-analysis-nav-item-${entry.id}`"
			:active="entry.id === selectedId"
			:title="labelFor(entry)"
			@click="emit('select', entry.id)"
		/>
	</VList>
</template>

<script setup lang="ts">
import { AnalysisEntry, AnalysisEntryId } from "../../poll-analysis.util";
import { PollQuestionResponse } from "@api-server";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	entries: AnalysisEntry[];
	selectedId: AnalysisEntryId;
	questionsById: Record<string, PollQuestionResponse>;
}>();

const emit = defineEmits<{
	(e: "select", id: AnalysisEntryId): void;
}>();

const { t } = useI18n();

const labelFor = (entry: AnalysisEntry): string => {
	if (entry.type === "overview") return t("components.cardElement.pollElement.overview");
	if (entry.type === "participants") return t("components.cardElement.pollElement.participants");
	return props.questionsById[entry.questionId]?.text ?? entry.questionId;
};
</script>
