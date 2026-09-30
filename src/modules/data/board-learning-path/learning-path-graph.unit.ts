import type { LearningPathStep } from "./learning-path-api";
import { edgesOf, orderedSteps, wouldCreateCycle } from "./learning-path-graph";

const step = (id: string, prerequisiteStepIds: string[] = [], positionX = 0, positionY = 0): LearningPathStep => ({
	id,
	linkedBoardId: `board-${id}`,
	title: id,
	isVisible: true,
	positionX,
	positionY,
	prerequisiteStepIds,
	unlockMode: "all",
	lockUntilPrerequisitesDone: false,
	status: "open",
});

describe("learning path graph", () => {
	describe("edgesOf", () => {
		it("should turn prerequisites into arrows and skip unknown steps", () => {
			const steps = [step("a"), step("b", ["a", "gone"])];

			expect(edgesOf(steps)).toEqual([{ fromId: "a", toId: "b" }]);
		});
	});

	describe("wouldCreateCycle", () => {
		const steps = [step("a"), step("b", ["a"]), step("c", ["b"])];

		it("should detect a circle over several steps", () => {
			expect(wouldCreateCycle(steps, "c", "a")).toBe(true);
		});

		it("should refuse an arrow to the step itself", () => {
			expect(wouldCreateCycle(steps, "a", "a")).toBe(true);
		});

		it("should allow a shortcut in the direction of the path", () => {
			expect(wouldCreateCycle(steps, "a", "c")).toBe(false);
		});
	});

	describe("orderedSteps", () => {
		it("should put every step after its prerequisites, then by position", () => {
			const steps = [step("end", ["left", "right"], 600, 0), step("right", [], 300, 200), step("left", [], 0, 100)];

			expect(orderedSteps(steps).map((s) => s.id)).toEqual(["left", "right", "end"]);
		});
	});
});
