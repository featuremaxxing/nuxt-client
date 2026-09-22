import { useLearningRoomApi } from "./LearningRoomApi.composable";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

/**
 * Knows which cards the current user has pinned, so every board can render the
 * pin button in the right state without asking the server per card.
 */
export const usePinnedCardsStore = defineStore("pinnedCardsStore", () => {
	const pinnedCardIds = ref<Set<string>>(new Set());
	const isLoaded = ref(false);

	const api = useLearningRoomApi();

	// every card on a board calls ensureLoaded on mount - without sharing the
	// in-flight promise that would be one request per card
	let pendingLoad: Promise<void> | undefined;

	const ensureLoaded = async (): Promise<void> => {
		if (isLoaded.value) {
			return;
		}
		if (!pendingLoad) {
			pendingLoad = api.fetchPinnedCardIds().then((cardIds) => {
				pinnedCardIds.value = new Set(cardIds);
				isLoaded.value = true;
				pendingLoad = undefined;
			});
		}
		await pendingLoad;
	};

	const reload = async (): Promise<void> => {
		isLoaded.value = false;
		pendingLoad = undefined;
		await ensureLoaded();
	};

	const isPinned = computed(
		() =>
			(cardId: string): boolean =>
				pinnedCardIds.value.has(cardId)
	);

	const togglePin = async (cardId: string): Promise<void> => {
		const wasPinned = pinnedCardIds.value.has(cardId);

		// optimistic - the button should react instantly, the card list is not
		// destructive and a failed call is rolled back below
		const next = new Set(pinnedCardIds.value);
		if (wasPinned) {
			next.delete(cardId);
		} else {
			next.add(cardId);
		}
		pinnedCardIds.value = next;

		const succeeded = wasPinned ? await api.unpinCard(cardId) : await api.pinCard(cardId);

		if (!succeeded) {
			const rollback = new Set(pinnedCardIds.value);
			if (wasPinned) {
				rollback.add(cardId);
			} else {
				rollback.delete(cardId);
			}
			pinnedCardIds.value = rollback;
		}
	};

	return { pinnedCardIds, isLoaded, ensureLoaded, reload, isPinned, togglePin };
});
