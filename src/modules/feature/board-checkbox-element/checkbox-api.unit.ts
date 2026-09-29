import { useCheckboxApi } from "./checkbox-api";
import { $axios } from "@/utils/api";
import { vi } from "vitest";

vi.mock("@/utils/api", () => ({
	$axios: { get: vi.fn(), put: vi.fn() },
	mapAxiosErrorToResponseError: () => ({ message: "error" }),
}));
vi.mock("@data-app", () => ({ notifyError: vi.fn() }));

describe("checkbox API", () => {
	const state = {
		entries: [{ userId: "student", firstName: "Jane", lastName: "Doe", checked: true, approved: false }],
		myEntry: { checked: true, approved: false },
		canManage: false,
	};
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked($axios.get).mockResolvedValue({ data: state });
		vi.mocked($axios.put).mockResolvedValue({ data: state });
	});

	it("loads the current student's checkbox and manager entries", async () => {
		expect(await useCheckboxApi().getState("element")).toEqual(state);
		expect($axios.get).toHaveBeenCalledWith("/v3/checkbox/element");
	});

	it("sets only the caller's checked state", async () => {
		expect(await useCheckboxApi().check("element", true)).toEqual(state);
		expect($axios.put).toHaveBeenCalledWith("/v3/checkbox/element/check", { checked: true });
	});

	it("approves and revokes a selected student", async () => {
		await useCheckboxApi().approve("element", "student", true);
		await useCheckboxApi().approve("element", "student", false);
		expect($axios.put).toHaveBeenNthCalledWith(1, "/v3/checkbox/element/approve/student", { approved: true });
		expect($axios.put).toHaveBeenNthCalledWith(2, "/v3/checkbox/element/approve/student", { approved: false });
	});
});
