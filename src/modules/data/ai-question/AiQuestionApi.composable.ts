import { $axios, mapAxiosErrorToResponseError } from "@/utils/api";
import {
	AiQuestionAnswerResponse,
	AiQuestionAnswersListResponse,
	AiQuestionApiFactory,
	AiQuestionApiInterface,
	AiQuestionConfigResponse,
	AiQuestionOwnAnswerResponse,
	CreateAiQuestionAnswerBodyParams,
} from "@api-server";
import { notifyError } from "@data-app";

// Thin wrapper around the generated AiQuestionApi, mirroring useAssignmentApi. The
// answer-submitting methods deliberately do NOT notify on error: the element UI shows
// the failure inline (the student keeps their input and can retry), so a global error
// toast would be noise on top of that.
export const useAiQuestionApi = () => {
	const aiQuestionApi: AiQuestionApiInterface = AiQuestionApiFactory(undefined, "/v3", $axios);

	const showGenericError = (error: unknown) => {
		const { message } = mapAxiosErrorToResponseError(error);
		notifyError(message);
	};

	const fetchConfig = async (elementId: string): Promise<AiQuestionConfigResponse | undefined> => {
		try {
			const response = await aiQuestionApi.aiQuestionControllerGetConfig(elementId);
			return response.data;
		} catch (error) {
			showGenericError(error);
			return undefined;
		}
	};

	// undefined result + `silent: true` = the caller handles the failure inline.
	const submitAnswer = async (
		elementId: string,
		body: CreateAiQuestionAnswerBodyParams,
		options: { silent?: boolean } = {}
	): Promise<AiQuestionOwnAnswerResponse["answer"] | "error"> => {
		try {
			const response = await aiQuestionApi.aiQuestionControllerSubmitAnswer(elementId, body);
			return response.data;
		} catch (error) {
			if (options.silent) return "error";

			showGenericError(error);
			return "error";
		}
	};

	const fetchOwnAnswer = async (elementId: string): Promise<AiQuestionOwnAnswerResponse | undefined> => {
		try {
			const response = await aiQuestionApi.aiQuestionControllerGetOwnAnswer(elementId);
			return response.data;
		} catch (error) {
			showGenericError(error);
			return undefined;
		}
	};

	const setAnswerFlag = async (elementId: string, flagged: boolean): Promise<AiQuestionAnswerResponse | undefined> => {
		try {
			const response = await $axios.patch<AiQuestionAnswerResponse>(`/v3/ai-questions/${elementId}/answer/flag`, {
				flagged,
			});
			return response.data;
		} catch (error) {
			showGenericError(error);
			return undefined;
		}
	};

	const fetchAnswers = async (elementId: string): Promise<AiQuestionAnswersListResponse | undefined> => {
		try {
			const response = await aiQuestionApi.aiQuestionControllerListAnswers(elementId);
			return response.data;
		} catch (error) {
			showGenericError(error);
			return undefined;
		}
	};

	return { fetchConfig, submitAnswer, fetchOwnAnswer, setAnswerFlag, fetchAnswers };
};
