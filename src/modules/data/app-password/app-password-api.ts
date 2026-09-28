import { $axios, mapAxiosErrorToResponseError } from "@/utils/api";
import { notifyError } from "@data-app";

export interface AppPassword {
	id: string;
	name: string;
	createdAt: string;
	lastUsedAt?: string;
}

// only returned right after creation - the secret cannot be read again later
export interface CreatedAppPassword extends AppPassword {
	token: string;
	username: string;
}

const reportError = (error: unknown) => notifyError(mapAxiosErrorToResponseError(error).message);

export const useAppPasswordApi = () => {
	const getAppPasswords = async (): Promise<AppPassword[] | undefined> => {
		try {
			return (await $axios.get<{ data: AppPassword[] }>("/v3/app-passwords")).data.data;
		} catch (error) {
			reportError(error);
		}
	};

	const createAppPassword = async (name: string): Promise<CreatedAppPassword | undefined> => {
		try {
			return (await $axios.post<CreatedAppPassword>("/v3/app-passwords", { name })).data;
		} catch (error) {
			reportError(error);
		}
	};

	const deleteAppPassword = async (id: string): Promise<boolean> => {
		try {
			await $axios.delete(`/v3/app-passwords/${encodeURIComponent(id)}`);
			return true;
		} catch (error) {
			reportError(error);
			return false;
		}
	};

	return { getAppPasswords, createAppPassword, deleteAppPassword };
};
