import type { LearningPath, LearningPathStep } from "./learning-path-api";
import { useLearningPathCardNavigation } from "./learning-path-card-navigation";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";

const fetchLearningPath = vi.fn();
vi.mock("./learning-path-api", () => ({ useLearningPathApi: () => ({ fetchLearningPath }) }));

const step = (id: string, props: Partial<LearningPathStep> = {}): LearningPathStep => ({
	id,
	linkedBoardId: "board-b",
	linkedCardId: `card-${id}`,
	title: id,
	isVisible: true,
	positionX: 0,
	positionY: 0,
	prerequisiteStepIds: [],
	unlockMode: "all",
	lockUntilPrerequisitesDone: false,
	status: "open",
	...props,
});

// a -> b -> c -> d, c is still locked, d is a whole board
const learningPath = (): LearningPath => ({
	boardId: "path",
	title: "KI kritisch nutzen",
	isEditor: false,
	steps: [
		step("a", { status: "done" }),
		step("b", { prerequisiteStepIds: ["a"] }),
		step("c", { prerequisiteStepIds: ["b"], status: "locked" }),
		step("x", { status: "unavailable", positionY: -10 }),
	],
	availableBoards: [],
});

describe("useLearningPathCardNavigation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchLearningPath.mockResolvedValue(learningPath());
	});

	const setup = async (cardId: string, pathId?: string) => {
		const navigation = useLearningPathCardNavigation(ref(pathId), ref(cardId));
		await flushPromises();
		return navigation;
	};

	it("should tell which step of the learning path the card is", async () => {
		const { isActive, step: current, position, total, path } = await setup("card-b", "path");

		expect(isActive.value).toBe(true);
		expect(path.value?.title).toBe("KI kritisch nutzen");
		expect(current.value?.id).toBe("b");
		// the unpublished step does not count for a student
		expect([position.value, total.value]).toEqual([2, 3]);
	});

	it("should page to the steps around it, but not into a locked one", async () => {
		const { previousRoute, nextRoute, pathRoute } = await setup("card-b", "path");

		expect(previousRoute.value).toEqual({
			name: "boards-card-detail",
			params: { boardId: "board-b", cardId: "card-a" },
			query: { learningPath: "path" },
		});
		expect(nextRoute.value).toBeUndefined();
		expect(pathRoute.value).toBe("/boards/path");
	});

	it("should do nothing without a learning path", async () => {
		const { isActive, step: current } = await setup("card-b");

		expect(isActive.value).toBe(false);
		expect(current.value).toBeUndefined();
		expect(fetchLearningPath).not.toHaveBeenCalled();
	});

	it("should count and reach text tiles like the other steps", async () => {
		fetchLearningPath.mockResolvedValue({
			...learningPath(),
			steps: [
				step("a", { status: "done" }),
				step("t", { linkedCardId: undefined, linkedBoardId: "", isText: true, prerequisiteStepIds: ["a"] }),
			],
		});

		const { position, total, nextRoute } = await setup("card-a", "path");

		expect([position.value, total.value]).toEqual([1, 2]);
		expect(nextRoute.value).toEqual({ path: "/boards/path", query: { step: "t" } });
	});
});
