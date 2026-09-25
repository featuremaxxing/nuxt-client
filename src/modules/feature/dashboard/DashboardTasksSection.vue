<template>
	<VSheet>
		<div class="d-flex align-center ga-2 mt-8">
			<h3 class="text-h3 mb-0" data-testid="dashboard-tasks-title">{{ title }}</h3>
			<VChip size="small" variant="tonal" data-testid="dashboard-tasks-count">{{ tasks.length }}</VChip>
		</div>
		<div class="grid-container pb-4" data-testid="task-courses">
			<VCard v-for="task in tasks" :key="task.id" class="grid-item" :href="`/homework/${task.id}`" @dragstart.prevent>
				<VCardText>
					<div class="d-flex align-center ga-1 text-body-2">
						<VIcon size="14" :icon="mdiFormatListChecks" />
						<template v-if="task.courseId">
							<span
								v-if="task.displayColor"
								class="course-dot"
								:style="{ backgroundColor: task.displayColor }"
								aria-hidden="true"
							/>
							<span data-testid="task-course-name">{{ task.courseName }}</span>
							<span aria-hidden="true">·</span>
						</template>
						<span>{{
							task.dueDate
								? `${t("pages.room.taskCard.label.due")} ${fromNowUtc(task.dueDate)}`
								: t("pages.dashboard.no.due.date")
						}}</span>
					</div>
					<h4 class="text-h4 my-1" data-testid="task-name">
						{{ task.name }}
					</h4>
					<div class="d-flex flex-wrap gc-4 gr-0">
						<div class="d-flex ga-2 mt-2">
							<TaskChipsTeacher v-if="isTeacher" :task />
							<TaskChipsStudent v-if="isStudent" with-done :task />
						</div>
					</div>
				</VCardText>
			</VCard>
		</div>
	</VSheet>
</template>

<script setup lang="ts">
import TaskChipsStudent from "@/components/tasks/task-chips/TaskChipsStudent.vue";
import TaskChipsTeacher from "@/components/tasks/task-chips/TaskChipsTeacher.vue";
import { fromNowUtc } from "@/utils/date-time.utils";
import { TaskResponse } from "@api-server";
import { useAppStoreRefs } from "@data-app";
import { mdiFormatListChecks } from "@icons/material";
import { useI18n } from "vue-i18n";

const { isTeacher, isStudent } = useAppStoreRefs();

defineProps<{
	title: string;
	tasks: TaskResponse[];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.grid-container {
	display: grid;
	gap: 12px;
	grid-template-columns: repeat(auto-fill, minmax(min(420px, 100%), 1fr));
}
.grid-item {
	min-width: 312px; /* Minimum supported screen width (360px) minus horizontal padding (48px) */
}
.course-dot {
	display: inline-block;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}
</style>
