import {
	type LearningPath,
	type LearningPathStep,
	type LearningPathStepUpdate,
	useLearningPathApi,
} from "./learning-path-api";
import { wouldCreateCycle } from "./learning-path-graph";
import { notifyError } from "@data-app";
import { useDebounceFn } from "@vueuse/core";
import { computed, type Ref, ref } from "vue";
import { useI18n } from "vue-i18n";

/**
 * The learning path of a board: its steps (boards of the room placed on a canvas), the arrows
 * between them and, for students, which steps are done, open or locked. Every change is sent
 * to the server right away and the path is reloaded, so titles and states stay correct.
 */
export const useLearningPathState = (boardId: Ref<string>) => {
	const { t } = useI18n();
	const api = useLearningPathApi();

	const path = ref<LearningPath>();
	const isLoading = ref(true);
	const hasError = ref(false);

	const steps = computed<LearningPathStep[]>(() => path.value?.steps ?? []);
	const isEditor = computed(() => path.value?.isEditor ?? false);
	// boards of the room that are not part of the path yet
	const availableBoards = computed(() =>
		(path.value?.availableBoards ?? []).filter((board) => !steps.value.some((step) => step.linkedBoardId === board.id))
	);

	const load = async (): Promise<void> => {
		try {
			path.value = await api.fetchLearningPath(boardId.value);
			hasError.value = false;
		} catch {
			hasError.value = true;
		} finally {
			isLoading.value = false;
		}
	};

	// socket messages arrive in bursts (e.g. while tiles are dragged around), one reload is enough
	const reloadSoon = useDebounceFn(load, 200);

	const findStep = (stepId: string): LearningPathStep | undefined => steps.value.find((step) => step.id === stepId);

	// the api already told the user what went wrong, the reload shows the actual state again
	const change = async (request: () => Promise<unknown>): Promise<boolean> => {
		try {
			await request();
			return true;
		} catch {
			return false;
		} finally {
			await load();
		}
	};

	const addStep = (linkedBoardId: string, positionX: number, positionY: number) =>
		change(() => api.createStep(boardId.value, linkedBoardId, positionX, positionY));

	const moveStep = async (stepId: string, positionX: number, positionY: number): Promise<void> => {
		const step = findStep(stepId);
		if (!step) return;
		step.positionX = positionX;
		step.positionY = positionY;
		try {
			await api.updateStep(stepId, { positionX, positionY });
		} catch {
			await load();
		}
	};

	const updateStep = (stepId: string, update: LearningPathStepUpdate) => change(() => api.updateStep(stepId, update));

	const connect = async (fromId: string, toId: string): Promise<boolean> => {
		const target = findStep(toId);
		if (!target || target.prerequisiteStepIds.includes(fromId)) return false;
		if (wouldCreateCycle(steps.value, fromId, toId)) {
			notifyError(t("pages.learningPath.error.circle"));
			return false;
		}

		return updateStep(toId, { prerequisiteStepIds: [...target.prerequisiteStepIds, fromId] });
	};

	const disconnect = async (fromId: string, toId: string): Promise<boolean> => {
		const target = findStep(toId);
		if (!target) return false;

		return updateStep(toId, { prerequisiteStepIds: target.prerequisiteStepIds.filter((id) => id !== fromId) });
	};

	const removeStep = (stepId: string) => change(() => api.deleteStep(stepId));

	return {
		path,
		steps,
		isEditor,
		availableBoards,
		isLoading,
		hasError,
		load,
		reloadSoon,
		addStep,
		moveStep,
		updateStep,
		connect,
		disconnect,
		removeStep,
	};
};
