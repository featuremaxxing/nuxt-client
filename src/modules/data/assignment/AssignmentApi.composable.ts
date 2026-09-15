import { $axios, mapAxiosErrorToResponseError } from "@/utils/api";
import {
	AssignmentApiFactory,
	AssignmentApiInterface,
	AssignmentListResponse,
	AssignmentSubmissionListResponse,
	AssignmentSubmissionResponse,
	GradeSubmissionBodyParams,
} from "@api-server";
import { notifyError } from "@data-app";

// Thin wrapper around the generated AssignmentApi, mirroring the shape of
// useFileStorageApi/useH5PEditorApi. No local store: the submission list is
// small (one room's worth of students) and always refetched after a mutation,
// so caching it would only add staleness risk for little benefit in V1.
export const useAssignmentApi = () => {
	const assignmentApi: AssignmentApiInterface = AssignmentApiFactory(undefined, "/v3", $axios);

	const showError = (error: unknown) => {
		const { message } = mapAxiosErrorToResponseError(error);
		notifyError(message);
	};

	const fetchSubmissions = async (elementId: string): Promise<AssignmentSubmissionListResponse | undefined> => {
		try {
			const response = await assignmentApi.assignmentControllerListSubmissions(elementId);
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	const createOwnSubmission = async (elementId: string): Promise<AssignmentSubmissionResponse | undefined> => {
		try {
			const response = await assignmentApi.assignmentControllerCreateOwnSubmission(elementId);
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	const submit = async (submissionId: string): Promise<AssignmentSubmissionResponse | undefined> => {
		try {
			const response = await assignmentApi.assignmentControllerSubmit(submissionId);
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	const deleteOwnSubmission = async (submissionId: string): Promise<boolean> => {
		try {
			await assignmentApi.assignmentControllerDeleteOwnSubmission(submissionId);
			return true;
		} catch (error) {
			showError(error);
			return false;
		}
	};

	const gradeSubmission = async (
		submissionId: string,
		body: GradeSubmissionBodyParams
	): Promise<AssignmentSubmissionResponse | undefined> => {
		try {
			const response = await assignmentApi.assignmentControllerGradeSubmission(submissionId, body);
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	const returnSubmission = async (
		submissionId: string,
		body: GradeSubmissionBodyParams
	): Promise<AssignmentSubmissionResponse | undefined> => {
		try {
			const response = await assignmentApi.assignmentControllerReturnSubmission(submissionId, body);
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	const listAssignments = async (roomId?: string): Promise<AssignmentListResponse | undefined> => {
		try {
			const response = await assignmentApi.assignmentControllerListAssignments(roomId);
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	return {
		listAssignments,
		fetchSubmissions,
		createOwnSubmission,
		submit,
		deleteOwnSubmission,
		gradeSubmission,
		returnSubmission,
	};
};
