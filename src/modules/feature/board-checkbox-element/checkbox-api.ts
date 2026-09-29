import { $axios, mapAxiosErrorToResponseError } from "@/utils/api";
import { notifyError } from "@data-app";

export interface CheckboxEntry {
	userId: string;
	firstName: string;
	lastName: string;
	checked: boolean;
	approved: boolean;
}

export interface CheckboxState {
	entries?: CheckboxEntry[];
	myEntry?: Pick<CheckboxEntry, "checked" | "approved">;
	canManage: boolean;
	hasCheckActivity: boolean;
}

const reportError = (error: unknown) => notifyError(mapAxiosErrorToResponseError(error).message);

export const useCheckboxApi = () => {
	const getState = async (elementId: string): Promise<CheckboxState | undefined> => {
		try {
			return (await $axios.get<CheckboxState>(`/v3/checkbox/${encodeURIComponent(elementId)}`)).data;
		} catch (error) {
			reportError(error);
		}
	};

	const check = async (elementId: string, checked: boolean): Promise<CheckboxState | undefined> => {
		try {
			return (await $axios.put<CheckboxState>(`/v3/checkbox/${encodeURIComponent(elementId)}/check`, { checked })).data;
		} catch (error) {
			reportError(error);
		}
	};

	const approve = async (elementId: string, userId: string, approved: boolean): Promise<CheckboxState | undefined> => {
		try {
			return (
				await $axios.put<CheckboxState>(
					`/v3/checkbox/${encodeURIComponent(elementId)}/approve/${encodeURIComponent(userId)}`,
					{ approved }
				)
			).data;
		} catch (error) {
			reportError(error);
		}
	};

	return { getState, check, approve };
};
