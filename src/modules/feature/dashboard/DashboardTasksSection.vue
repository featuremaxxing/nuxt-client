<template>
	<section class="lr-section" :class="{ 'lr-section--band': band }">
		<div class="lr-section__head">
			<h3 class="lr-section__title" data-testid="dashboard-tasks-title">{{ title }}</h3>
			<span class="lr-section__count lr-num" data-testid="dashboard-tasks-count">{{ tasks.length }}</span>
		</div>
		<ul class="lr-chart" :class="{ 'lr-chart--large': band }" data-testid="task-courses">
			<li
				v-for="(task, index) in tasks"
				:key="task.id"
				class="lr-tile-slot"
				:style="{ '--tile-index': Math.min(index, 11) }"
			>
				<a
					class="lr-tile"
					:href="`/homework/${task.id}`"
					:data-status="tileStatus(task)"
					:data-overdue="isTaskOverdue(task) || undefined"
					:style="{ '--tile-color': toCategoryColor(task.displayColor) }"
					@dragstart.prevent
				>
					<span class="lr-tile__top">
						<span class="lr-tile__symbol" aria-hidden="true">{{ getTaskSymbol(task) }}</span>
						<span class="lr-tile__number lr-num" aria-hidden="true">{{ dueDayFor(task) }}</span>
					</span>
					<span class="lr-tile__station" :title="t(stationLabelKey(task))" aria-hidden="true" />
					<h4 class="lr-tile__name" data-testid="task-name">{{ task.name }}</h4>
					<span class="lr-tile__meta">
						<span v-if="task.courseId" data-testid="task-course-name">{{ task.courseName }}</span>
						<span v-if="task.courseId" aria-hidden="true">·</span>
						<span>{{
							task.dueDate
								? `${t("pages.room.taskCard.label.due")} ${fromNowUtc(task.dueDate)}`
								: t("pages.dashboard.no.due.date")
						}}</span>
					</span>
					<span class="lr-tile__chips">
						<TaskChipsTeacher v-if="isTeacher" :task />
						<TaskChipsStudent v-if="isStudent" with-done :task />
					</span>
				</a>
			</li>
		</ul>
	</section>
</template>

<script setup lang="ts">
import TaskChipsStudent from "@/components/tasks/task-chips/TaskChipsStudent.vue";
import TaskChipsTeacher from "@/components/tasks/task-chips/TaskChipsTeacher.vue";
import { toCategoryColor } from "@/utils/color.utils";
import { fromNowUtc, parseUtc } from "@/utils/date-time.utils";
import { TaskResponse } from "@api-server";
import { useAppStoreRefs } from "@data-app";
import { getTaskStation, getTaskSymbol, isTaskOverdue, TaskStation } from "@data-tasks";
import { useI18n } from "vue-i18n";

const { isTeacher, isStudent } = useAppStoreRefs();

withDefaults(
	defineProps<{
		title: string;
		tasks: TaskResponse[];
		band?: boolean;
	}>(),
	{ band: false }
);

const { t } = useI18n();

// Status is read by shape (outline / hatched / solid / dashed), not by color alone.
const tileStatus = (task: TaskResponse): TaskStation => getTaskStation(task, isTeacher.value ? "teacher" : "student");

const STATION_LABEL_KEYS: Record<TaskStation, string> = {
	open: "components.organisms.TasksDashboardMain.tab.open",
	submitted: "pages.room.taskCard.student.label.submitted",
	graded: "pages.tasks.graded",
	draft: "common.words.drafts",
};

const stationLabelKey = (task: TaskResponse) => STATION_LABEL_KEYS[tileStatus(task)];

// The "atomic number": the due day of month, the one number a student scans for.
const dueDayFor = (task: TaskResponse) => (task.dueDate ? parseUtc(task.dueDate).local().format("D") : "–");
</script>

<style lang="scss" scoped>
.lr-section {
	margin-top: var(--lr-space-6);
}

.lr-section__head {
	display: flex;
	align-items: baseline;
	gap: var(--lr-space-3);
	margin-bottom: var(--lr-space-3);
}

.lr-section__title {
	margin: 0;
	font-size: var(--heading-4);
}

.lr-section__count {
	font-size: var(--heading-4);
	font-weight: 700;
	color: var(--lr-text-muted);
}

// "heute": the highlighter band that runs across the full content width
.lr-section--band {
	position: relative;
	padding: var(--lr-space-4) var(--lr-space-5) var(--lr-space-5);
	margin-inline: calc(var(--lr-space-5) * -1);
	background: var(--lr-today);
	color: var(--lr-on-today);

	.lr-section__count {
		color: var(--lr-on-today);
	}

	.lr-tile {
		border-color: var(--lr-cat-ink);
	}
}

.lr-chart {
	display: grid;
	gap: var(--lr-space-3);
	grid-template-columns: repeat(auto-fill, minmax(min(var(--lr-tile-min), 100%), 1fr));
	list-style: none;
	padding: 0;
	margin: 0;

	&--large {
		grid-template-columns: repeat(auto-fill, minmax(min(var(--lr-tile-min-large), 100%), 1fr));
	}
}

.lr-tile-slot {
	display: flex;
	animation: lr-tile-enter var(--lr-duration-enter) var(--lr-ease-out) both;
	animation-delay: calc(var(--tile-index) * 30ms);
}

@keyframes lr-tile-enter {
	from {
		opacity: 0;
		transform: translateY(6px);
	}
}

@media (prefers-reduced-motion: reduce) {
	.lr-tile-slot {
		animation: none;
	}
}

.lr-tile {
	position: relative;
	display: grid;
	grid-template-rows: auto auto 1fr auto;
	gap: var(--lr-space-1);
	width: 100%;
	min-height: 188px;
	padding: var(--lr-space-3) var(--lr-space-4) var(--lr-space-4);
	border: 1px solid rgba(20, 26, 34, 0.18);
	border-radius: var(--lr-radius);
	background: var(--tile-color);
	color: var(--lr-cat-ink);
	text-decoration: none;
	transition:
		box-shadow var(--lr-duration-fast) var(--lr-ease-out),
		opacity var(--lr-duration) var(--lr-ease-out);

	&:hover,
	&:focus-visible {
		box-shadow: inset 0 0 0 2px var(--lr-cat-ink);
	}

	&:focus-visible {
		outline: 2px solid var(--lr-focus);
		outline-offset: 3px;
	}

	&[data-status="draft"] {
		background: transparent;
		border: 2px dashed var(--lr-line-strong);
		color: rgb(var(--v-theme-on-surface));
	}
}

.lr-chart--large .lr-tile {
	min-height: 220px;
}

.lr-tile__top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--lr-space-2);
	padding-inline-end: 28px;
}

.lr-tile__symbol {
	font-family: var(--font-accent);
	font-stretch: var(--font-stretch-symbol);
	font-weight: 800;
	font-size: 2.75rem;
	line-height: 0.95;
	letter-spacing: -0.02em;
}

.lr-chart--large .lr-tile__symbol {
	font-size: 3.5rem;
}

.lr-tile__number {
	font-size: 1.25rem;
	font-weight: 700;
	line-height: 1;
	padding-top: 4px;
}

// station marker: outline = open, hatched = submitted, solid = graded, dashed = draft
.lr-tile__station {
	position: absolute;
	top: var(--lr-space-3);
	right: var(--lr-space-3);
	width: 16px;
	height: 16px;
	border: 2px solid currentColor;
	border-radius: var(--lr-radius-sm);
}

.lr-tile[data-status="submitted"] .lr-tile__station {
	background: repeating-linear-gradient(-45deg, currentColor 0 2px, transparent 2px 5px);
}

.lr-tile[data-status="graded"] .lr-tile__station {
	background: currentColor;
}

.lr-tile[data-status="draft"] .lr-tile__station {
	border-style: dashed;
}

.lr-tile__name {
	margin: var(--lr-space-2) 0 0;
	font-size: 1.0625rem;
	font-weight: 700;
	line-height: 1.25;
	color: inherit;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.lr-tile__meta {
	display: flex;
	flex-wrap: wrap;
	gap: 0 var(--lr-space-1);
	font-size: var(--text-sm);
	line-height: 1.35;
	opacity: 0.88;
}

.lr-tile__chips {
	display: flex;
	flex-wrap: wrap;
	gap: var(--lr-space-1);
	margin-top: var(--lr-space-2);

	// chips on a category fill: light plate, ink text, same in both themes
	:deep(.v-chip) {
		background: rgba(255, 255, 255, 0.72) !important;
		color: var(--lr-cat-ink) !important;

		.v-chip__underlay {
			opacity: 0 !important;
		}
	}
}

.lr-tile[data-overdue] .lr-tile__chips :deep(.v-chip) {
	font-weight: 700;
}
</style>
