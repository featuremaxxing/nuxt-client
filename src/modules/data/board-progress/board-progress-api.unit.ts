import { useBoardProgressApi } from "./board-progress-api";
import { $axios } from "@/utils/api";
import { vi } from "vitest";

vi.mock("@/utils/api", () => ({
	$axios: { get: vi.fn() },
	mapAxiosErrorToResponseError: () => ({ message: "error" }),
}));
vi.mock("@data-app", () => ({ notifyError: vi.fn() }));

describe("board progress API", () => {
	const boardProgress = {
		boardId: "board",
		boardTitle: "Board 1",
		isTeacherView: false,
		summary: { done: 1, total: 2 },
		items: [],
	};
	const roomProgress = {
		roomId: "room",
		summary: { done: 1, total: 2 },
		boards: [boardProgress],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked($axios.get).mockImplementation((url: string) => {
			if (url.includes("/boards/")) return Promise.resolve({ data: boardProgress });
			return Promise.resolve({ data: roomProgress });
		});
	});

	it("loads the progress of a board", async () => {
		expect(await useBoardProgressApi().getBoardProgress("board")).toEqual(boardProgress);
		expect($axios.get).toHaveBeenCalledWith("/v3/boards/board/progress", { params: { details: false } });
	});

	it("loads the progress of a board with details", async () => {
		await useBoardProgressApi().getBoardProgress("board", true);
		expect($axios.get).toHaveBeenCalledWith("/v3/boards/board/progress", { params: { details: true } });
	});

	it("loads the progress of a room", async () => {
		expect(await useBoardProgressApi().getRoomProgress("room")).toEqual(roomProgress);
		expect($axios.get).toHaveBeenCalledWith("/v3/rooms/room/progress", { params: { details: false } });
	});

	it("reports an error and resolves to undefined when the request fails", async () => {
		vi.mocked($axios.get).mockRejectedValueOnce(new Error("boom"));

		expect(await useBoardProgressApi().getBoardProgress("board")).toBeUndefined();
	});
});
