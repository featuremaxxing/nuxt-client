<template>
	<DefaultWireframe :headline="t('common.words.tasks')" max-width="limited" :fab-items="fabItems">
		<template v-if="isAssignmentToolEnabled">
			<VTabs v-model="activeTab" align-tabs="center" class="mb-2">
				<VTab value="assignments" data-testid="tab-assignments">
					{{ t("pages.tasks.tabs.assignments") }}
				</VTab>
				<VTab value="classic" data-testid="tab-tasks-classic">
					{{ t("pages.tasks.tabs.classic") }}
				</VTab>
			</VTabs>
			<VWindow v-model="activeTab">
				<VWindowItem value="assignments">
					<AssignmentsOverview
						:loading="assignmentsLoading"
						:assignments="assignments"
						:current-assignments="currentAssignments"
						:past-assignments="pastAssignments"
					/>
				</VWindowItem>
				<VWindowItem value="classic">
					<SvsLoading :loading-state="onlyOnceTasksLoadingState">
						<template #loading>
							<div class="d-flex flex-column w-100">
								<VSkeletonLoader type="text" :max-width="'15%'" />
								<VSkeletonLoader v-for="task of 4" ref="skeleton" :key="task" :type="'list-item-avatar-two-line'" />
							</div>
						</template>
						<template #default>
							<TasksOverviewStudent v-if="isStudent" />
							<TasksOverviewTeacher v-else-if="isTeacher" />
						</template>
					</SvsLoading>
				</VWindowItem>
			</VWindow>
		</template>

		<SvsLoading v-else :loading-state="onlyOnceTasksLoadingState">
			<template #loading>
				<div class="d-flex flex-column w-100">
					<VSkeletonLoader type="text" :max-width="'15%'" />
					<VSkeletonLoader v-for="task of 4" ref="skeleton" :key="task" :type="'list-item-avatar-two-line'" />
				</div>
			</template>
			<template #default>
				<TasksOverviewStudent v-if="isStudent" />
				<TasksOverviewTeacher v-else-if="isTeacher" />
			</template>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import AssignmentsOverview from "@/components/assignments/AssignmentsOverview.vue";
import TasksOverviewStudent from "@/components/tasks/TasksOverviewStudent.vue";
import TasksOverviewTeacher from "@/components/tasks/TasksOverviewTeacher.vue";
import { buildPageTitle } from "@/utils/pageTitle";
import { Permission } from "@api-server";
import { useAppStore, useAppStoreRefs } from "@data-app";
import { useAssignmentsOfOverview } from "@data-assignment";
import { useEnvConfig } from "@data-env";
import { useTasksOfOverview } from "@data-tasks";
import { mdiPlus } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { useUrlSearchParams } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const { isStudent, isTeacher } = useAppStoreRefs();
const hasLoadedOnce = ref(false);
const { t } = useI18n();
const params = useUrlSearchParams("history");

const envConfig = useEnvConfig();
const isAssignmentToolEnabled = computed(() => envConfig.value.FEATURE_COLUMN_BOARD_ASSIGNMENT_ENABLED === true);

const activeTab = computed({
	get: () => (params.tab as string) || "assignments",
	set: (value: string) => {
		params.tab = value;
	},
});

const { tasksLoadingState, status } = useTasksOfOverview();

const { assignments, currentAssignments, pastAssignments, loading: assignmentsLoading } =
	useAssignmentsOfOverview();

const onlyOnceTasksLoadingState = computed(() => {
	if (tasksLoadingState.value === "loading" && !hasLoadedOnce.value) {
		return "loading";
	} else if (tasksLoadingState.value === "loaded" || hasLoadedOnce.value) {
		return "loaded";
	}
	return "idle";
});

useTitle(buildPageTitle(t("common.words.tasks")));

const appStore = useAppStore();

const fabItems = computed(() => {
	if (!isStudent.value && appStore.userPermissions.includes(Permission.HOMEWORK_CREATE)) {
		return [
			{
				icon: mdiPlus,
				label: t("components.organisms.TasksDashboardMain.fab.createTask"),
				href: "/homework/new?returnUrl=tasks",
				dataTestId: "add-task",
			},
		];
	}

	return undefined;
});

const unWatch = watch(status, (status) => {
	if (status === "completed") {
		hasLoadedOnce.value = true;
		unWatch();
	}
});
</script>
