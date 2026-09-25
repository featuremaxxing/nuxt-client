<template>
	<SvsLoading :loading-state="tasksLoadingState">
		<div class="lr-dash" :data-highlight="highlight">
			<div class="lr-dash__head">
				<h2 class="lr-dash__title">{{ t("common.words.tasks") }}</h2>
				<ul class="lr-legend" :aria-label="t('pages.dashboard.tasks.legend')" data-testid="dashboard-tasks-legend">
					<li v-for="entry in legend" :key="entry.key">
						<button
							type="button"
							class="lr-legend__item"
							:class="`lr-legend__item--${entry.key}`"
							:aria-pressed="pinned === entry.key"
							:data-testid="`legend-${entry.key}`"
							@mouseenter="hovered = entry.key"
							@mouseleave="hovered = undefined"
							@focus="hovered = entry.key"
							@blur="hovered = undefined"
							@click="pinned = pinned === entry.key ? undefined : entry.key"
						>
							<span class="lr-legend__swatch" aria-hidden="true" />
							<span class="lr-legend__label">{{ t(entry.label) }}</span>
							<span class="lr-legend__count lr-num">{{ entry.count }}</span>
						</button>
					</li>
				</ul>
			</div>
			<DashboardAssignments v-if="isAssignmentToolEnabled" />
			<template v-if="isTeacher">
				<DashboardTasksOpen
					data-testid="teacher-tasks-open"
					:empty-msg="t('pages.tasks.open.emptyState.title')"
					:tasks="openForTeacherNotOverdue"
				/>

				<DashboardTasksSection
					v-if="ungradedForTeacherOverdue.length > 0"
					data-testid="teacher-tasks-not-graded"
					:title="t('pages.tasks.notGraded')"
					:tasks="ungradedForTeacherOverdue"
				/>

				<DashboardTasksSection
					v-if="gradedForTeacherOverdue.length > 0"
					data-testid="teacher-tasks-graded"
					:title="t('pages.tasks.graded')"
					:tasks="gradedForTeacherOverdue"
				/>

				<DashboardTasksSection
					v-if="draftsSortedByDueDate.length > 0"
					data-testid="teacher-tasks-drafts"
					:title="t('common.words.drafts')"
					:tasks="draftsSortedByDueDate"
				/>
			</template>
			<template v-else-if="isStudent">
				<DashboardTasksOpen
					data-testid="student-tasks-open"
					:empty-msg="t('pages.tasks.open.emptyState.title')"
					:tasks="openForStudent"
				/>

				<DashboardTasksSection
					v-if="ungradedForStudent.length > 0"
					data-testid="student-tasks-not-graded"
					:title="t('pages.tasks.notGraded')"
					:tasks="ungradedForStudent"
				/>

				<DashboardTasksSection
					v-if="gradedForStudent.length > 0"
					data-testid="student-tasks-graded"
					:title="t('pages.tasks.graded')"
					:tasks="gradedForStudent"
				/>
			</template>

			<VBtn class="mt-8" variant="outlined" data-test-id="show-all-tasks" to="/tasks">
				{{ t("common.actions.show.all") }}
			</VBtn>
		</div>
	</SvsLoading>
</template>

<script setup lang="ts">
import DashboardAssignments from "./DashboardAssignments.vue";
import DashboardTasksOpen from "./DashboardTasksOpen.vue";
import DashboardTasksSection from "./DashboardTasksSection.vue";
import { useAppStoreRefs } from "@data-app";
import { useEnvConfig } from "@data-env";
import { getTaskStation, isTaskOverdue, TaskStation, toSortedByDueDate, useTasks } from "@data-tasks";
import { SvsLoading } from "@ui-containers";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { isTeacher, isStudent } = useAppStoreRefs();
const envConfig = useEnvConfig();
const isAssignmentToolEnabled = computed(() => envConfig.value.FEATURE_COLUMN_BOARD_ASSIGNMENT_ENABLED === true);

const {
	drafts,
	openForTeacher,
	gradedForTeacher,
	ungradedForTeacher,
	openForStudent,
	ungradedForStudent,
	gradedForStudent,
	tasksLoadingState,
} = useTasks({
	range: {
		from: { amount: 1, unit: "month" },
		to: { amount: 14, unit: "day" },
	},
});

const openForTeacherNotOverdue = computed(() => openForTeacher.value.filter((task) => !isTaskOverdue(task)));
const gradedForTeacherOverdue = computed(() => gradedForTeacher.value.filter(isTaskOverdue));
const ungradedForTeacherOverdue = computed(() => ungradedForTeacher.value.filter(isTaskOverdue));
const draftsSortedByDueDate = computed(() => toSortedByDueDate(drafts.value));
type LegendKey = TaskStation | "overdue";

const hovered = ref<LegendKey>();
const pinned = ref<LegendKey>();
const highlight = computed(() => hovered.value ?? pinned.value);

const visibleTasks = computed(() => {
	if (isTeacher.value) {
		return [
			...openForTeacherNotOverdue.value,
			...ungradedForTeacherOverdue.value,
			...gradedForTeacherOverdue.value,
			...draftsSortedByDueDate.value,
		];
	}
	if (isStudent.value) return [...openForStudent.value, ...ungradedForStudent.value, ...gradedForStudent.value];
	return [];
});

const LEGEND: { key: LegendKey; label: string }[] = [
	{ key: "open", label: "components.organisms.TasksDashboardMain.tab.open" },
	{ key: "submitted", label: "pages.room.taskCard.student.label.submitted" },
	{ key: "graded", label: "pages.tasks.graded" },
	{ key: "overdue", label: "pages.tasks.overdue" },
	{ key: "draft", label: "common.words.drafts" },
];

// The chart's key: every shape and color on the page is explained here, with its count.
const legend = computed(() => {
	const viewer = isTeacher.value ? "teacher" : "student";
	const counts: Record<LegendKey, number> = { open: 0, submitted: 0, graded: 0, overdue: 0, draft: 0 };
	visibleTasks.value.forEach((task) => {
		counts[getTaskStation(task, viewer)] += 1;
		if (isTaskOverdue(task) && !task.status.isDraft) counts.overdue += 1;
	});
	return LEGEND.filter((entry) => entry.key !== "draft" || isTeacher.value).map((entry) => ({
		...entry,
		count: counts[entry.key],
	}));
});
</script>

<style lang="scss" scoped>
.lr-dash__head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--lr-space-3) var(--lr-space-5);
	margin-top: var(--lr-space-7);
	padding-bottom: var(--lr-space-3);
	border-bottom: 2px solid rgb(var(--v-theme-on-surface));
}

.lr-dash__title {
	margin: 0;
}

.lr-legend {
	display: flex;
	flex-wrap: wrap;
	gap: var(--lr-space-1) var(--lr-space-2);
	list-style: none;
	padding: 0;
	margin: 0;
}

.lr-legend__item {
	display: inline-flex;
	align-items: center;
	gap: var(--lr-space-2);
	min-height: 44px;
	padding: 0 var(--lr-space-3);
	border: 1px solid var(--lr-line);
	border-radius: var(--lr-radius);
	background: rgb(var(--v-theme-surface));
	color: rgb(var(--v-theme-on-surface));
	font-family: var(--font-accent);
	font-weight: 600;
	font-size: 0.9375rem;
	cursor: pointer;
	transition: border-color var(--lr-duration-fast) var(--lr-ease-out);

	&:hover,
	&[aria-pressed="true"] {
		border-color: rgb(var(--v-theme-on-surface));
	}

	&[aria-pressed="true"] {
		box-shadow: inset 0 0 0 1px rgb(var(--v-theme-on-surface));
	}
}

.lr-legend__count {
	font-weight: 800;
}

// swatches repeat the tile station shapes
.lr-legend__swatch {
	width: 14px;
	height: 14px;
	border: 2px solid currentColor;
	border-radius: 3px;
}

.lr-legend__item--submitted .lr-legend__swatch {
	background: repeating-linear-gradient(-45deg, currentColor 0 2px, transparent 2px 5px);
}

.lr-legend__item--graded .lr-legend__swatch {
	background: currentColor;
}

.lr-legend__item--draft .lr-legend__swatch {
	border-style: dashed;
}

.lr-legend__item--overdue .lr-legend__swatch {
	border-color: rgb(var(--v-theme-error));
	background: rgb(var(--v-theme-error));
	border-radius: 50%;
}

// signature interaction: the legend lights up its tiles, everything else steps back
.lr-dash[data-highlight] :deep(.lr-tile) {
	opacity: 0.5; // dimmed, not hidden: ink text on a fill stays >= 3:1
}

.lr-dash[data-highlight="open"] :deep(.lr-tile[data-status="open"]),
.lr-dash[data-highlight="submitted"] :deep(.lr-tile[data-status="submitted"]),
.lr-dash[data-highlight="graded"] :deep(.lr-tile[data-status="graded"]),
.lr-dash[data-highlight="draft"] :deep(.lr-tile[data-status="draft"]),
.lr-dash[data-highlight="overdue"] :deep(.lr-tile[data-overdue]) {
	opacity: 1;
	box-shadow: inset 0 0 0 2px var(--lr-cat-ink);
}
</style>
