<template>
	<SvsLoading :loading-state="tasksLoadingState">
		<h2 class="mb-0 mt-16">{{ t("common.words.tasks") }}</h2>
		<div
			v-if="gradedCount > 0 || overdueCount > 0"
			class="d-flex align-center ga-2 mt-2 flex-wrap"
			data-testid="dashboard-tasks-summary"
		>
			<InfoChip v-if="gradedCount > 0" :icon="mdiCheckCircleOutline" variant="tonal" data-testid="tasks-summary-graded">
				{{ t("pages.dashboard.tasks.summary.graded", { count: gradedCount }) }}
			</InfoChip>
			<WarningChip
				v-if="overdueCount > 0"
				:icon="mdiClockAlertOutline"
				variant="tonal"
				data-testid="tasks-summary-overdue"
			>
				{{ t("pages.dashboard.tasks.summary.overdue", { count: overdueCount }) }}
			</WarningChip>
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
	</SvsLoading>
</template>

<script setup lang="ts">
import DashboardAssignments from "./DashboardAssignments.vue";
import DashboardTasksOpen from "./DashboardTasksOpen.vue";
import DashboardTasksSection from "./DashboardTasksSection.vue";
import { useAppStoreRefs } from "@data-app";
import { useEnvConfig } from "@data-env";
import { isTaskOverdue, toSortedByDueDate, useTasks } from "@data-tasks";
import { mdiCheckCircleOutline, mdiClockAlertOutline } from "@icons/material";
import { InfoChip, WarningChip } from "@ui-chip";
import { SvsLoading } from "@ui-containers";
import { computed } from "vue";
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
const gradedCount = computed(() => {
	if (isTeacher.value) return gradedForTeacher.value.length;
	if (isStudent.value) return gradedForStudent.value.length;
	return 0;
});
const overdueCount = computed(() => {
	if (isTeacher.value) return ungradedForTeacherOverdue.value.length;
	if (isStudent.value) return openForStudent.value.filter(isTaskOverdue).length;
	return 0;
});
</script>
