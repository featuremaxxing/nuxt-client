<template>
	<section v-if="loading || currentAssignments.length > 0" class="mt-8" data-testid="dashboard-assignments">
		<h3 class="text-h3 mb-2">{{ t("pages.assignments.current") }}</h3>
		<div
			v-if="loading"
			class="d-flex align-center ga-2 text-body-2 py-2"
			role="status"
			aria-live="polite"
			data-testid="dashboard-assignments-loading"
		>
			<VProgressCircular indeterminate size="20" width="2" />
			<span>{{ t("common.labels.loading") }}</span>
		</div>
		<VList v-else class="py-0" data-testid="dashboard-assignments-list">
			<AssignmentsOverviewListItem
				v-for="assignment in currentAssignments"
				:key="assignment.id"
				:assignment="assignment"
				@click="openAssignment(assignment)"
			/>
		</VList>
	</section>
</template>

<script setup lang="ts">
import AssignmentsOverviewListItem from "@/components/assignments/AssignmentsOverviewListItem.vue";
import { AssignmentListItemResponse } from "@api-server";
import { useAssignmentsOfOverview } from "@data-assignment";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();
const { currentAssignments, loading } = useAssignmentsOfOverview();

const openAssignment = (assignment: AssignmentListItemResponse) => {
	void router.push(`/boards/${assignment.boardId}/cards/${assignment.cardId}`);
};
</script>
