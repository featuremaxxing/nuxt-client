import { nowUtc, parseUtc } from "@/utils/date-time.utils";
import { createTestableSharedComposable } from "@/utils/create-shared-composable";
import { AssignmentListItemResponse } from "@api-server";
import { computed, ref } from "vue";
import { useAssignmentApi } from "./AssignmentApi.composable";

// Overview of every assignment in the caller's rooms, used by the assignments
// list page and the room dashboard section. No caching beyond the shared
// composable: the window between "not started" and "over" moves with the wall
// clock, so consumers refetch on mount instead of trusting stale buckets.
export const useAssignments = (options: { fetchImmediate?: boolean } = {}) => {
	const { listAssignments } = useAssignmentApi();

	const assignments = ref<AssignmentListItemResponse[]>([]);
	const loading = ref(true);

	const fetchAssignments = async () => {
		loading.value = true;
		const result = await listAssignments();
		if (result) {
			assignments.value = result.assignments;
		}
		loading.value = false;
	};

	// An assignment counts as past once its hand-in window (dueDate incl. the
	// grace period, i.e. lateUntil) is fully over. Assignments without any
	// deadline never become past.
	const isPast = (item: AssignmentListItemResponse) => {
		const deadline = item.lateUntil ?? item.dueDate;
		return deadline !== undefined && deadline !== null && parseUtc(deadline).isBefore(nowUtc());
	};

	const currentAssignments = computed(() => assignments.value.filter((item) => !isPast(item)));
	const pastAssignments = computed(() => assignments.value.filter(isPast));

	if (options.fetchImmediate) {
		void fetchAssignments();
	}

	return {
		assignments,
		currentAssignments,
		pastAssignments,
		loading,
		fetchAssignments,
	};
};

export const useAssignmentsOfOverview = createTestableSharedComposable(() => useAssignments({ fetchImmediate: true }));
