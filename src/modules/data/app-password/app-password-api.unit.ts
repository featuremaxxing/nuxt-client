import { useAppPasswordApi } from "./app-password-api";
import { $axios } from "@/utils/api";
import { notifyError } from "@data-app";
import { vi } from "vitest";

vi.mock("@/utils/api", () => ({
	$axios: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
	mapAxiosErrorToResponseError: () => ({ message: "error" }),
}));
vi.mock("@data-app", () => ({ notifyError: vi.fn() }));

describe("app password API", () => {
	const appPassword = { id: "id1", name: "Laptop", createdAt: "2026-09-28T10:00:00.000Z" };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("lists the app passwords of the user", async () => {
		vi.mocked($axios.get).mockResolvedValueOnce({ data: { data: [appPassword] } });

		expect(await useAppPasswordApi().getAppPasswords()).toEqual([appPassword]);
		expect($axios.get).toHaveBeenCalledWith("/v3/app-passwords");
	});

	it("creates an app password", async () => {
		const created = { ...appPassword, token: "id1.secret", username: "a@b.de" };
		vi.mocked($axios.post).mockResolvedValueOnce({ data: created });

		expect(await useAppPasswordApi().createAppPassword("Laptop")).toEqual(created);
		expect($axios.post).toHaveBeenCalledWith("/v3/app-passwords", { name: "Laptop" });
	});

	it("revokes an app password", async () => {
		vi.mocked($axios.delete).mockResolvedValueOnce({});

		expect(await useAppPasswordApi().deleteAppPassword("id1")).toBe(true);
		expect($axios.delete).toHaveBeenCalledWith("/v3/app-passwords/id1");
	});

	it("reports errors", async () => {
		vi.mocked($axios.delete).mockRejectedValueOnce(new Error("boom"));

		expect(await useAppPasswordApi().deleteAppPassword("id1")).toBe(false);
		expect(notifyError).toHaveBeenCalledWith("error");
	});
});
