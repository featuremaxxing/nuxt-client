import LearningPathCardHint from "./LearningPathCardHint.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { LearningPathColor } from "@api-server";
import { LEARNING_PATH_CARD_STEPS_KEY } from "@data-board-learning-path";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

describe("LearningPathCardHint", () => {
	const setup = (cardId: string) =>
		mount(LearningPathCardHint, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				provide: {
					[LEARNING_PATH_CARD_STEPS_KEY as symbol]: ref({
						"card-k": [
							{ pathId: "red", pathTitle: "Rot", color: LearningPathColor.Red, position: 3, status: "locked" },
							{ pathId: "blue", pathTitle: "Blau", position: 1, status: "done" },
						],
					}),
				},
			},
			props: { cardId },
		});

	it("should name every learning path the card is a step of and say when it is still locked", () => {
		const wrapper = setup("card-k");

		expect(wrapper.findAll(".lp-card-hint__chip")).toHaveLength(2);
		expect(wrapper.get("[data-testid=learning-path-card-hint-red]").text()).toContain(
			"pages.learningPath.cards.chip.locked"
		);
		expect(wrapper.get("[data-testid=learning-path-card-hint-blue]").text()).not.toContain(
			"pages.learningPath.cards.chip.locked"
		);
	});

	it("should show nothing on other cards", () => {
		const wrapper = setup("card-other");

		expect(wrapper.find("[data-testid=learning-path-card-hint]").exists()).toBe(false);
	});
});
