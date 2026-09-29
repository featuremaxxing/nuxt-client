import { $axios, mapAxiosErrorToResponseError } from "@/utils/api";
import {
	AssignmentApiFactory,
	AssignmentApiInterface,
	AssignmentFeedbackContainerResponse,
	PeerReviewAssignmentResponse,
	PeerReviewAssignResultResponse,
	PeerReviewSettingsBodyParams,
	PeerReviewSettingsResponse,
	PeerReviewSubmitBodyParams,
	PeerReviewTaskResponse,
} from "@api-server";
import { notifyError } from "@data-app";

// Thin wrapper around the generated AssignmentApi (which carries the peer-review routes
// since upstream merged the PeerReview tag into the Assignment tag), mirroring
// useAssignmentApi. No local store - the review-task list is small and always refetched
// after a mutation.
export const usePeerReviewApi = () => {
	const peerReviewApi: AssignmentApiInterface = AssignmentApiFactory(undefined, "/v3", $axios);

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

	const listAssignments = async (elementId: string): Promise<PeerReviewAssignmentResponse[] | undefined> => {
		try {
			const response = await peerReviewApi.peerReviewControllerListAssignments(elementId);
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	const unassign = async (elementId: string, submissionId: string, reviewerUserId: string): Promise<boolean> => {
		try {
			await peerReviewApi.peerReviewControllerUnassign(elementId, submissionId, reviewerUserId);
			return true;
		} catch (error) {
			showError(error);
			return false;
		}
	};

	// Gets (or, on first call for this review, creates) the container the reviewer uploads their
	// own correction files (annotated PDFs/images, no audio) to - see the review notes.
	const ensureReviewFeedbackContainer = async (
		reviewId: string
	): Promise<AssignmentFeedbackContainerResponse | undefined> => {
		try {
			const response = await peerReviewApi.peerReviewControllerEnsureReviewFeedbackContainer(reviewId);
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
		listAssignments,
		unassign,
		ensureReviewFeedbackContainer,
		fetchMyTasks,
		submitReview,
	};
};
