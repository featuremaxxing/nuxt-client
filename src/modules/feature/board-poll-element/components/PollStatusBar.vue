<template>
	<VCardText class="poll-status-bar">
		<VChip size="small" :color="statusColor" data-testid="poll-status-chip">
			{{ t(`components.cardElement.pollElement.status.${element.content.pollStatus}`) }}
		</VChip>
		<VChip v-if="element.content.isAnonymous" size="small" variant="outlined">
			{{ t("components.cardElement.pollElement.anonymous") }}
		</VChip>
		<VChip v-if="element.content.showResultsLive" size="small" variant="outlined">
			{{ t("components.cardElement.pollElement.liveResults") }}
		</VChip>
		<VChip
			v-if="startDateLabel"
			size="small"
			variant="outlined"
			:prepend-icon="mdiClockOutline"
			data-testid="poll-start-date-chip"
		>
			{{ startDateLabel }}
		</VChip>
		<VChip
			v-if="closesAtLabel"
			size="small"
			variant="outlined"
			:prepend-icon="mdiClockOutline"
			data-testid="poll-closes-at-chip"
		>
			{{ closesAtLabel }}
		</VChip>
		<VChip v-if="remainingTimeLabel" size="small" variant="outlined" data-testid="poll-remaining-time">
			{{ remainingTimeLabel }}
		</VChip>
		<span class="poll-participant-count" data-testid="poll-participant-count">
			{{ t("components.cardElement.pollElement.votedCount", { voted: totalVotes, total: participantCount }) }}
		</span>

		<VSpacer v-if="isEditor || canOpenAnalysis" />

		<template v-if="isEditor">
			<VBtn
				v-if="element.content.pollStatus !== PollStatus.OPEN"
				variant="tonal"
				color="primary"
				size="small"
				data-testid="poll-status-bar-open"
				@click="setStatus(PollStatus.OPEN)"
			>
				{{ t("components.cardElement.pollElement.open") }}
			</VBtn>
			<VBtn
				v-else
				variant="tonal"
				size="small"
				data-testid="poll-status-bar-close"
				@click="setStatus(PollStatus.CLOSED)"
			>
				{{ t("components.cardElement.pollElement.close") }}
			</VBtn>
			<VMenu>
				<template #activator="{ props: menuProps }">
					<VBtn variant="text" :prepend-icon="mdiTrayArrowDown" v-bind="menuProps" data-testid="poll-export-menu">
						{{ t("common.actions.download") }}
					</VBtn>
				</template>
				<VList>
					<VListItem data-testid="poll-export-csv" @click="onExportCsv">
						<VListItemTitle>{{ t("components.cardElement.pollElement.exportCsv") }}</VListItemTitle>
					</VListItem>
					<VListItem data-testid="poll-export-pdf" @click="onExportPdf">
						<VListItemTitle>{{ t("components.cardElement.pollElement.exportPdf") }}</VListItemTitle>
					</VListItem>
				</VList>
			</VMenu>
		</template>

		<VBtn
			v-if="canOpenAnalysis"
			variant="text"
			:prepend-icon="mdiPresentation"
			data-testid="poll-open-analysis"
			@click="emit('open:analysis')"
		>
			{{ t("components.cardElement.pollElement.analysis") }}
		</VBtn>
	</VCardText>
</template>

<script setup lang="ts">
import { collectCardChartSvgsByQuestionId } from "../poll-chart-dom.util";
import { buildPollResultsCsv, buildPollResultsPdf } from "../poll-export.util";
import { svgToPng } from "../svg-to-png.util";
import { usePollOpenState } from "../usePollOpenState.composable";
import { PollElement } from "@/types/board/ContentElement";
import { formatUtc } from "@/utils/date-time.utils";
import { downloadBlob } from "@/utils/fileHelper";
import { PollAnswerMode, PollQuestionResultResponse, PollStatus, PollVoterResponse } from "@api-server";
import { useCardStore } from "@data-board";
import { mdiClockOutline, mdiPresentation, mdiTrayArrowDown } from "@icons/material";
import { computed, toRef } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: PollElement;
	isEditor: boolean;
	totalVotes: number;
	participantCount: number;
	results?: PollQuestionResultResponse[];
	voters?: PollVoterResponse[];
	canOpenAnalysis?: boolean;
}>();

const emit = defineEmits<{
	(e: "open:analysis"): void;
}>();

const { t } = useI18n();
const { updateElementRequest } = useCardStore();
const { now } = usePollOpenState(toRef(props, "element"));

const setStatus = (pollStatus: PollStatus) => {
	updateElementRequest({
		element: {
			...props.element,
			content: { ...props.element.content, pollStatus },
		},
	});
};

const statusColor = computed(() => {
	switch (props.element.content.pollStatus) {
		case PollStatus.OPEN:
			return "success";
		case PollStatus.CLOSED:
			return "default";
		default:
			return "warning";
	}
});

// Informational chips showing the configured start/end regardless of pollStatus - same
// presentation as the start/due date chips on AssignmentElementTeacherDisplay.vue.
const startDateLabel = computed(() => {
	const formatted = props.element.content.opensAt ? formatUtc(props.element.content.opensAt, "dateTime") : undefined;
	return formatted ? t("components.cardElement.pollElement.startsAtLabel", { date: formatted }) : undefined;
});

const closesAtLabel = computed(() => {
	const formatted = props.element.content.closesAt ? formatUtc(props.element.content.closesAt, "dateTime") : undefined;
	return formatted ? t("components.cardElement.pollElement.closesAtLabel", { date: formatted }) : undefined;
});

// The dynamic countdown chip: while OPEN but still before opensAt, this replaces the usual
// "closes in n min" with an absolute "starts on ..." - a countdown to a start that hasn't
// happened yet would be misleading here, since the vote form isn't reachable regardless of
// how the remaining time until closesAt is phrased.
const remainingTimeLabel = computed(() => {
	if (props.element.content.pollStatus !== PollStatus.OPEN) return undefined;

	const opensAt = props.element.content.opensAt;
	if (opensAt && now.value.getTime() < new Date(opensAt).getTime()) {
		return t("components.cardElement.pollElement.notStartedYet", { date: formatUtc(opensAt, "dateTime") });
	}

	const closesAt = props.element.content.closesAt;
	if (!closesAt) return undefined;

	const diffMs = new Date(closesAt).getTime() - now.value.getTime();
	if (diffMs <= 0) return t("components.cardElement.pollElement.closed");

	const minutes = Math.ceil(diffMs / 60000);
	return t("components.cardElement.pollElement.remainingMinutes", { minutes });
});

const onExportCsv = () => {
	const csv = buildPollResultsCsv(
		props.element.content,
		{
			participantCount: props.participantCount,
			perQuestion: props.results ?? [],
		},
		props.voters
	);
	// BOM prefix must stay the literal escape sequence below - eslint --fix has been known to
	// rewrite it into an actual invisible BOM character; re-check with `git diff` after linting.
	const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
	downloadBlob(blob, `${fileNameBase()}.csv`);
};

const onExportPdf = async () => {
	const chartPngBlobs: Record<string, Blob> = {};

	// Looked up by question id, not by position in the document: a global, position-based query
	// would silently mis-pair charts with questions as soon as more than one rendering of this
	// poll's charts exists in the DOM (e.g. a fullscreen analysis overlay), or when a TEXT
	// question without a chart is interleaved between chart questions.
	const svgByQuestionId = collectCardChartSvgsByQuestionId(props.element.id);
	const questionsWithCharts = props.element.content.questions.filter(
		(question) => question.answerMode !== PollAnswerMode.TEXT
	);
	for (const question of questionsWithCharts) {
		const svg = svgByQuestionId[question.id];
		if (!svg) continue;
		try {
			chartPngBlobs[question.id] = await svgToPng(svg);
		} catch {
			// If rasterization fails for a single chart, the PDF still gets built without that
			// image - the numeric breakdown is drawn from data directly either way.
		}
	}

	const blob = await buildPollResultsPdf(
		props.element.content,
		{ participantCount: props.participantCount, perQuestion: props.results ?? [] },
		chartPngBlobs
	);
	downloadBlob(blob, `${fileNameBase()}.pdf`);
};

const fileNameBase = () => (props.element.content.title || "umfrage").replace(/[^\w-]+/g, "_");
</script>

<style scoped lang="scss">
.poll-status-bar {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.poll-participant-count {
	font-size: 0.85rem;
	opacity: 0.8;
}
</style>
