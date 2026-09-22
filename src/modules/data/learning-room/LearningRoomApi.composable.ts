import { $axios, mapAxiosErrorToResponseError } from "@/utils/api";
import { BoardResponse } from "@api-server";
import { notifyError } from "@data-app";

/**
 * Hand written on purpose: the generated serverApi client does not know the
 * learning room endpoints yet. Regenerating it needs a running server
 * (`generate-client:server`), so this wrapper is the bridge until the next
 * regeneration. CardSkeletonResponse.pinnedCardId was added to the generated
 * model by hand for the same reason.
 */

export type LearningRoomBoard = BoardResponse;

export const useLearningRoomApi = () => {
	const showError = (error: unknown) => {
		const { message } = mapAxiosErrorToResponseError(error);
		notifyError(message);
	};

	const fetchLearningRoom = async (): Promise<LearningRoomBoard | undefined> => {
		try {
			const response = await $axios.get<LearningRoomBoard>("/v3/learning-room");
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	const fetchPinnedCardIds = async (): Promise<string[]> => {
		try {
			const response = await $axios.get<{ cardIds: string[] }>("/v3/learning-room/pinned-cards");
			return response.data.cardIds;
		} catch (error) {
			showError(error);
			return [];
		}
	};

	const pinCard = async (cardId: string): Promise<boolean> => {
		try {
			await $axios.post("/v3/learning-room/pinned-cards", { cardId });
			return true;
		} catch (error) {
			showError(error);
			return false;
		}
	};

	const unpinCard = async (cardId: string): Promise<boolean> => {
		try {
			await $axios.delete(`/v3/learning-room/pinned-cards/${cardId}`);
			return true;
		} catch (error) {
			showError(error);
			return false;
		}
	};

	const movePinnedCard = async (pinnedCardId: string, toColumnId: string, toPosition?: number): Promise<boolean> => {
		try {
			await $axios.put(`/v3/learning-room/pinned-cards/${pinnedCardId}/position`, {
				toColumnId,
				toPosition,
			});
			return true;
		} catch (error) {
			showError(error);
			return false;
		}
	};

	return { fetchLearningRoom, fetchPinnedCardIds, pinCard, unpinCard, movePinnedCard };
};
