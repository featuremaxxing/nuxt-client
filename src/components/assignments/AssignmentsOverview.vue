<template>
	<section class="assignments-overview" data-testid="assignments-overview">
		<div v-if="loading" class="text-caption" data-testid="assignments-loading">
			{{ t("common.labels.loading") }}
		</div>

		<template v-else>
			<EmptyState v-if="assignments.length === 0" :title="t('pages.assignments.empty')" data-testid="assignments-empty">
				<template #media>
					<ContentEmptySvg />
				</template>
			</EmptyState>

			<template v-else>
				<h2 class="text-h6 mt-2 mb-1" data-testid="assignments-current-heading">
					{{ t("pages.assignments.current") }}
				</h2>
				<VList class="assignments-list py-0" data-testid="assignments-current-list">
					<AssignmentsOverviewListItem
						v-for="item in currentAssignments"
						:key="item.id"
						:assignment="item"
						@click="openAssignment(item)"
					/>
				</VList>

				<template v-if="pastAssignments.length > 0">
					<h2 class="text-h6 mt-6 mb-1" data-testid="assignments-past-heading">
						{{ t("pages.assignments.past") }}
					</h2>
					<VList class="assignments-list py-0" data-testid="assignments-past-list">
						<AssignmentsOverviewListItem
							v-for="item in pastAssignments"
							:key="item.id"
							:assignment="item"
							@click="openAssignment(item)"
						/>
					</VList>
				</template>
			</template>
		</template>
	</section>
</template>

<script setup lang="ts">
import AssignmentsOverviewListItem from "./AssignmentsOverviewListItem.vue";
import { AssignmentListItemResponse } from "@api-server";
import { ContentEmptySvg, EmptyState } from "@ui-empty-state";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

// Every assignment in the caller's rooms, split by hand-in window. Students
// never receive not-yet-started assignments (filtered server-side), so no
// role check is needed here - teacher-only chips live in the list item.
defineProps<{
	loading: boolean;
	assignments: AssignmentListItemResponse[];
	currentAssignments: AssignmentListItemResponse[];
	pastAssignments: AssignmentListItemResponse[];
}>();

const router = useRouter();
const { t } = useI18n();

// Deep link to the element's card inside its board - the same target a user
// reaches by navigating room -> board by hand.
const openAssignment = (item: AssignmentListItemResponse) => {
	void router.push(`/boards/${item.boardId}/cards/${item.cardId}`);
};
</script>
