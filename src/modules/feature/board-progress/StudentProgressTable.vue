<template>
	<VExpansionPanels variant="accordion" data-testid="student-progress-table">
		<VExpansionPanel v-for="row in rows" :key="row.userId" :data-testid="`student-progress-${row.userId}`">
			<VExpansionPanelTitle>
				<div class="d-flex align-center w-100 ga-4">
					<span class="student-name font-weight-bold">{{ fullName(row) }}</span>
					<ProgressBar :done="row.done" :total="row.total" class="flex-grow-1" />
					<span class="text-no-wrap text-body-2" data-testid="student-progress-count">
						{{ row.done }}/{{ row.total }}
					</span>
				</div>
			</VExpansionPanelTitle>
			<VExpansionPanelText>
				<p v-if="row.openItems.length === 0" class="mb-0" data-testid="student-progress-all-done">
					<VIcon :icon="mdiCheck" color="success" class="mr-1" />
					{{ t("components.boardProgress.students.allDone") }}
				</p>
				<template v-else>
					<p class="text-caption mb-1">{{ t("components.boardProgress.students.openItems") }}</p>
					<VList density="compact">
						<VListItem
							v-for="item in row.openItems"
							:key="item.elementId"
							:to="`/boards/${item.boardId}#card-${item.cardId}`"
							:data-testid="`student-open-item-${row.userId}-${item.elementId}`"
						>
							<template #prepend>
								<VIcon :icon="iconFor(item.type)" />
							</template>
							<VListItemTitle>{{ item.title }}</VListItemTitle>
							<VListItemSubtitle>{{ item.boardTitle }}</VListItemSubtitle>
							<template v-if="isOverdue(item)" #append>
								<VChip size="small" color="error" variant="tonal" data-testid="student-open-item-overdue">
									{{ t("components.boardProgress.students.overdue") }}
								</VChip>
							</template>
						</VListItem>
					</VList>
				</template>
			</VExpansionPanelText>
		</VExpansionPanel>
	</VExpansionPanels>
</template>

<script setup lang="ts">
import ProgressBar from "./ProgressBar.vue";
import { ProgressElementType, StudentOpenItem, StudentProgress } from "@data-board-progress";
import { mdiCheck, mdiCheckboxOutline, mdiClipboardTextOutline, mdiPoll } from "@icons/material";
import { useI18n } from "vue-i18n";

defineProps<{ rows: StudentProgress[] }>();

const { t } = useI18n();

const fullName = (row: StudentProgress) => [row.firstName, row.lastName].filter(Boolean).join(" ");

const isOverdue = (item: StudentOpenItem) => !!item.dueDate && new Date(item.dueDate).getTime() < Date.now();

const iconFor = (type: ProgressElementType) => {
	switch (type) {
		case "checkbox":
			return mdiCheckboxOutline;
		case "assignment":
			return mdiClipboardTextOutline;
		default:
			return mdiPoll;
	}
};
</script>

<style scoped>
.student-name {
	min-width: 12rem;
}
</style>
