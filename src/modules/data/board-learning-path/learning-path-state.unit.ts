import type { LearningPath, LearningPathStep } from "./learning-path-api";
import { useLearningPathState } from "./learning-path-state";
import { ref } from "vue";

const fetchLearningPath = vi.fn();
const createStep = vi.fn();
const updateStep = vi.fn();
const deleteStep = vi.fn();
const updateColor = vi.fn();
const enroll = vi.fn();
const unenroll = vi.fn();

vi.mock("./learning-path-api", () => ({
	useLearningPathApi: () => ({ fetchLearningPath, createStep, updateStep, deleteStep, updateColor, enroll, unenroll }),
}));

const notifyError = vi.fn();
vi.mock("@data-app", () => ({ notifyError: (...args: unknown[]) => notifyError(...args) }));

vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));

const step = (id: string, prerequisiteStepIds: string[] = []): LearningPathStep => ({
	id,
	linkedBoardId: `board-${id}`,
	title: id,
	isVisible: true,
	positionX: 0,
	positionY: 0,
	prerequisiteStepIds,
	unlockMode: "all",
	lockUntilPrerequisitesDone: false,
	status: "open",
});

const path = (steps: LearningPathStep[]): LearningPath => ({
	boardId: "path",
	isEditor: true,
	steps,
	availableBoards: [
		{ id: "board-a", title: "A", isVisible: true },
		{ id: "board-new", title: "Neu", isVisible: false },
	],
});

describe("useLearningPathState", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchLearningPath.mockResolvedValue(path([step("a"), step("b", ["a"])]));
	});

	const setup = async () => {
		const state = useLearningPathState(ref("path"));
		await state.load();
		return state;
	};

	it("should offer only boards that are not part of the path yet", async () => {
		const { availableBoards, isEditor } = await setup();

		expect(isEditor.value).toBe(true);
		expect(availableBoards.value.map((board) => board.id)).toEqual(["board-new"]);
	});

	it("should still offer a board whose single cards are steps, and know those cards", async () => {
		fetchLearningPath.mockResolvedValueOnce(
			path([{ ...step("k"), linkedBoardId: "board-new", linkedCardId: "card-k" }, step("a")])
		);

		const { availableBoards, roomBoards, cardIdsInPath } = await setup();

		expect(availableBoards.value.map((board) => board.id)).toEqual(["board-new"]);
		expect(roomBoards.value.map((board) => board.id)).toEqual(["board-a", "board-new"]);
		expect(Array.from(cardIdsInPath.value)).toEqual(["card-k"]);
	});

	it("should report a failed load", async () => {
		fetchLearningPath.mockRejectedValueOnce(new Error("offline"));

		const { hasError } = await setup();

		expect(hasError.value).toBe(true);
	});

	it("should add a board and reload", async () => {
		const { addStep } = await setup();

		await addStep("board-new", 10, 20);

		expect(createStep).toHaveBeenCalledWith("path", "board-new", 10, 20, undefined);
		expect(fetchLearningPath).toHaveBeenCalledTimes(2);
	});

	it("should add a single card of a board", async () => {
		const { addStep } = await setup();

		await addStep("board-new", 10, 20, "card-1");

		expect(createStep).toHaveBeenCalledWith("path", "board-new", 10, 20, "card-1");
	});

	it("should move a tile right away and save the position", async () => {
		const { moveStep, steps } = await setup();

		const saving = moveStep("a", 100, 50);

		expect(steps.value[0]).toMatchObject({ positionX: 100, positionY: 50 });
		await saving;
		expect(updateStep).toHaveBeenCalledWith("a", { positionX: 100, positionY: 50 });
	});

	it("should add an arrow to the prerequisites of the target", async () => {
		fetchLearningPath.mockResolvedValue(path([step("a"), step("b"), step("c", ["a"])]));
		const { connect } = await setup();

		const connected = await connect("b", "c");

		expect(connected).toBe(true);
		expect(updateStep).toHaveBeenCalledWith("c", { prerequisiteStepIds: ["a", "b"] });
	});

	it("should refuse an arrow that closes a circle", async () => {
		const { connect } = await setup();

		const connected = await connect("b", "a");

		expect(connected).toBe(false);
		expect(updateStep).not.toHaveBeenCalled();
		expect(notifyError).toHaveBeenCalledWith("pages.learningPath.error.circle");
	});

	it("should remove an arrow", async () => {
		const { disconnect } = await setup();

		await disconnect("a", "b");

		expect(updateStep).toHaveBeenCalledWith("b", { prerequisiteStepIds: [] });
	});

	it("should reload when a change failed", async () => {
		deleteStep.mockRejectedValueOnce(new Error("forbidden"));
		const { removeStep } = await setup();

		const removed = await removeStep("a");

		expect(removed).toBe(false);
		expect(fetchLearningPath).toHaveBeenCalledTimes(2);
	});

	describe("learning path colors and enrollment", () => {
		it("should expose the color and whether the student goes the learning path", async () => {
			fetchLearningPath.mockResolvedValue({
				...path([]),
				isEditor: false,
				color: "green",
				isEnrolled: true,
				canChoose: true,
			});

			const { color, isEnrolled, canChoose } = await setup();

			expect(color.value).toBe("green");
			expect(isEnrolled.value).toBe(true);
			expect(canChoose.value).toBe(true);
		});

		it("should change the color and reload", async () => {
			const { setColor } = await setup();

			await setColor("red" as never);

			expect(updateColor).toHaveBeenCalledWith("path", "red");
			expect(fetchLearningPath).toHaveBeenCalledTimes(2);
		});

		it("should enroll and leave, reloading the states each time", async () => {
			const { enroll: goPath, leave } = await setup();

			await goPath();
			await leave();

			expect(enroll).toHaveBeenCalledWith("path");
			expect(unenroll).toHaveBeenCalledWith("path");
			expect(fetchLearningPath).toHaveBeenCalledTimes(3);
		});
	});
});
