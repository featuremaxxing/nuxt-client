import { useLearningRoomApi } from "./LearningRoomApi.composable";
import { usePinnedCardsStore } from "./pinnedCards.store";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./LearningRoomApi.composable");

const mockedUseLearningRoomApi = vi.mocked(useLearningRoomApi);

describe("pinnedCardsStore", () => {
	const setup = (options?: { cardIds?: string[]; pinSucceeds?: boolean }) => {
		const fetchPinnedCardIds = vi.fn().mockResolvedValue(options?.cardIds ?? []);
		const pinCard = vi.fn().mockResolvedValue(options?.pinSucceeds ?? true);
		const unpinCard = vi.fn().mockResolvedValue(options?.pinSucceeds ?? true);

		mockedUseLearningRoomApi.mockReturnValue({
			fetchLearningRoom: vi.fn(),
			fetchPinnedCardIds,
			pinCard,
			unpinCard,
			movePinnedCard: vi.fn(),
		});

		return { fetchPinnedCardIds, pinCard, unpinCard };
	};

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	describe("ensureLoaded", () => {
		it("should load the pinned ids once", async () => {
			const { fetchPinnedCardIds } = setup({ cardIds: ["card-1"] });
			const store = usePinnedCardsStore();

			await store.ensureLoaded();
			await store.ensureLoaded();

			expect(fetchPinnedCardIds).toHaveBeenCalledTimes(1);
			expect(store.isPinned("card-1")).toBe(true);
		});

		it("should share one request when many cards ask at the same time", async () => {
			const { fetchPinnedCardIds } = setup();
			const store = usePinnedCardsStore();

			await Promise.all([store.ensureLoaded(), store.ensureLoaded(), store.ensureLoaded()]);

			expect(fetchPinnedCardIds).toHaveBeenCalledTimes(1);
		});
	});

	describe("togglePin", () => {
		it("should pin a card that is not pinned yet", async () => {
			const { pinCard } = setup();
			const store = usePinnedCardsStore();

			await store.togglePin("card-1");

			expect(pinCard).toHaveBeenCalledWith("card-1");
			expect(store.isPinned("card-1")).toBe(true);
		});

		it("should unpin a card that is pinned", async () => {
			const { unpinCard } = setup({ cardIds: ["card-1"] });
			const store = usePinnedCardsStore();
			await store.ensureLoaded();

			await store.togglePin("card-1");

			expect(unpinCard).toHaveBeenCalledWith("card-1");
			expect(store.isPinned("card-1")).toBe(false);
		});

		it("should roll back when the request fails", async () => {
			setup({ pinSucceeds: false });
			const store = usePinnedCardsStore();

			await store.togglePin("card-1");

			expect(store.isPinned("card-1")).toBe(false);
		});
	});
});
