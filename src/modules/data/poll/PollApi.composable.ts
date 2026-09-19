import { $axios, mapAxiosErrorToResponseError } from "@/utils/api";
import { PollApiFactory, PollApiInterface, PollResultsResponse } from "@api-server";
import { notifyError } from "@data-app";

// Thin wrapper around the generated PollApi, mirroring the shape of
// AssignmentApi.composable.ts. Note there is no REST endpoint for casting a vote - voting is
// socket-only (see poll-vote-request/-success in pollActions.ts and PollSocketApi.composable.ts).
// The only REST poll endpoint is fetching results.
export const usePollApi = () => {
	const pollApi: PollApiInterface = PollApiFactory(undefined, "/v3", $axios);

	const showError = (error: unknown) => {
		const { message } = mapAxiosErrorToResponseError(error);
		notifyError(message);
	};

	const fetchResults = async (elementId: string): Promise<PollResultsResponse | undefined> => {
		try {
			const response = await pollApi.pollControllerGetResults(elementId);
			return response.data;
		} catch (error) {
			showError(error);
			return undefined;
		}
	};

	return {
		fetchResults,
	};
};
