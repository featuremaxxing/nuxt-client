<template>
	<template v-if="!tasks || tasks.length === 0">
		<EmptyState data-testid="empty-state-tasks" :title="emptyMsg">
			<template #media> <SvgTasksEmpty /></template>
		</EmptyState>
	</template>
	<div v-else v-bind="$attrs">
		<DashboardTasksSection v-for="group in taskGroups" :key="group.key" :title="group.title" :tasks="group.tasks" />
	</div>
</template>

<script setup lang="ts">
import DashboardTasksSection from "./DashboardTasksSection.vue";
import SvgTasksEmpty from "@/assets/img/SvgTasksEmpty.vue";
import { TaskResponse } from "@api-server";
import { groupTasksByDueBucket, TASK_DUE_BUCKETS, TaskDueBucket } from "@data-tasks";
import { EmptyState } from "@ui-empty-state";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	emptyMsg: string;
	tasks: TaskResponse[];
}>();

defineOptions({ inheritAttrs: false });

const { t } = useI18n();

const GROUP_LABEL_KEYS: Record<TaskDueBucket, string> = {
	overdue: "pages.dashboard.tasks.group.overdue",
	today: "pages.dashboard.tasks.group.today",
	thisWeek: "pages.dashboard.tasks.group.thisWeek",
	later: "pages.dashboard.tasks.group.later",
	noDueDate: "pages.dashboard.tasks.group.noDueDate",
};

const taskGroups = computed(() => {
	const buckets = groupTasksByDueBucket(props.tasks);
	return TASK_DUE_BUCKETS.filter((bucket) => buckets[bucket].length > 0).map((bucket) => ({
		key: bucket,
		title: t(GROUP_LABEL_KEYS[bucket]),
		tasks: buckets[bucket],
	}));
});
</script>
