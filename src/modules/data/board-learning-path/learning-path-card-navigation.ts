import { type LearningPath, type LearningPathStep, useLearningPathApi } from "./learning-path-api";
import { stepRoute } from "./learning-path-cards";
import { orderedSteps } from "./learning-path-graph";
import { computed, type Ref, ref, watch } from "vue";
import type { RouteLocationRaw } from "vue-router";

const isOpenable = (step: LearningPathStep) => step.status === "open" || step.status === "done";

/**
 * A card opened as a step of a learning path (detail view with ?learningPath=<id>): which step it
 * is, the steps before and after it that can be opened, and the way back to the learning path.
 */
export const useLearningPathCardNavigation = (pathId: Ref<string | undefined>, cardId: Ref<string | undefined>) => {
	const api = useLearningPathApi();
	const path = ref<LearningPath>();

	const load = async (): Promise<void> => {
		if (!pathId.value) {
			path.value = undefined;
			return;
		}
		try {
			path.value = await api.fetchLearningPath(pathId.value);
		} catch {
			path.value = undefined;
		}
	};

	watch(pathId, load, { immediate: true });

	const isActive = computed(() => !!pathId.value);

	// students only see the published steps, as in the list of the learning path
	// text tiles are read on the learning path itself, paging skips them
	const chain = computed(() =>
		orderedSteps(path.value?.steps ?? []).filter(
			(step) => !step.isText && (path.value?.isEditor || step.status !== "unavailable")
		)
	);
	const index = computed(() => chain.value.findIndex((step) => step.linkedCardId === cardId.value));
	const step = computed(() => (index.value >= 0 ? chain.value[index.value] : undefined));

	const routeOf = (candidate: LearningPathStep | undefined): RouteLocationRaw | undefined =>
		candidate && pathId.value && (path.value?.isEditor || isOpenable(candidate))
			? stepRoute(candidate, pathId.value)
			: undefined;

	const previousRoute = computed(() => routeOf(index.value > 0 ? chain.value[index.value - 1] : undefined));
	const nextRoute = computed(() =>
		routeOf(index.value >= 0 && index.value < chain.value.length - 1 ? chain.value[index.value + 1] : undefined)
	);
	const pathRoute = computed<RouteLocationRaw | undefined>(() =>
		pathId.value ? `/boards/${pathId.value}` : undefined
	);

	return {
		isActive,
		path,
		step,
		position: computed(() => index.value + 1),
		total: computed(() => chain.value.length),
		previousRoute,
		nextRoute,
		pathRoute,
		reload: load,
	};
};
