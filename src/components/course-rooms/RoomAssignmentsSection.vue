<template>
	<section v-if="assignments.length > 0" class="room-assignments" data-testid="room-assignments-section">
		<h2 class="text-h6 mb-1">{{ t("pages.room.assignments.title") }}</h2>
		<VList class="py-0" data-testid="room-assignments-list">
			<AssignmentsOverviewListItem
				v-for="item in assignments"
				:key="item.id"
				:assignment="item"
				@click="openAssignment(item)"
			/>
		</VList>
	</section>
</template>

<script setup lang="ts">
import AssignmentsOverviewListItem from "@/components/assignments/AssignmentsOverviewListItem.vue";
import { AssignmentListItemResponse } from "@api-server";
import { useAssignmentApi } from "@data-assignment";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

// Assignments of this room, shown above the regular learning content. Renders
// nothing at all when the room has none - the section must not add clutter to
// rooms that do not use the assignment tool.
const props = defineProps<{
	roomId: string;
}>();

const { t } = useI18n();
const router = useRouter();
const { listAssignments } = useAssignmentApi();

const assignments = ref<AssignmentListItemResponse[]>([]);

onMounted(async () => {
	const result = await listAssignments(props.roomId);
	assignments.value = result?.assignments ?? [];
});

const openAssignment = (item: AssignmentListItemResponse) => {
	void router.push(`/boards/${item.boardId}/cards/${item.cardId}`);
};
</script>
