import { $axios, mapAxiosErrorToResponseError } from "@/utils/api";
import {
	PeerReviewApiFactory,
	PeerReviewAssignResultResponse,
	PeerReviewSettingsBodyParams,
	PeerReviewSettingsResponse,
	PeerReviewSubmitBodyParams,
	PeerReviewTaskResponse,
} from "@api-server";
import { notifyError } from "@data-app";

// Thin wrapper around the generated PeerReviewApi, mirroring useAssignmentApi. No local
// store - the review-task list is small and always refetched after a mutation.
export const usePeerReviewApi = () => {
	const peerReviewApi = PeerReviewApiFactory(undefined, "/v3", $axios);

	const showError = (error: unknown) => {
		const { message } = mapAxiosErrorToResponseError(error);
		notifyError(message);
	};

	const updateSettings = async (
		elementId: string,
		body: PeerReviewSettingsBodyParams
	): Promise<PeerReviewSettingsResponse | undefined> => {
		try {
			const response = await peerReviewApi.peerReviewControllerUpdateSettings(elementId, body);
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	const autoAssign = async (elementId: string): Promise<PeerReviewAssignResultResponse | undefined> => {
		try {
			const response = await peerReviewApi.peerReviewControllerAutoAssign(elementId);
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	const manualAssign = async (
		elementId: string,
		assignments: { submissionId: string; reviewerUserId: string }[]
	): Promise<PeerReviewAssignResultResponse | undefined> => {
		try {
			const response = await peerReviewApi.peerReviewControllerManualAssign(elementId, { assignments });
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	const fetchMyTasks = async (): Promise<PeerReviewTaskResponse[] | undefined> => {
		try {
			const response = await peerReviewApi.peerReviewControllerMyTasks();
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	const submitReview = async (
		reviewId: string,
		body: PeerReviewSubmitBodyParams
	): Promise<PeerReviewTaskResponse | undefined> => {
		try {
			const response = await peerReviewApi.peerReviewControllerSubmitReview(reviewId, body);
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	return {
		updateSettings,
		autoAssign,
		manualAssign,
		fetchMyTasks,
		submitReview,
	};
};
