import PollAnalysisDialog from "./PollAnalysisDialog.vue";
import { PollElement } from "@/types/board/ContentElement";
import { pollElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { PollAnswerMode, PollChartType, PollVoterResponse } from "@api-server";
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";

const { getStateMock } = vi.hoisted(() => ({ getStateMock: vi.fn() }));

vi.mock("@data-poll", () => ({
	usePollsStore: () => ({ getState: getStateMock }),
}));

describe("PollAnalysisDialog", () => {
	const buildElement = (overrides: Partial<PollElement["content"]> = {}): PollElement =>
		pollElementResponseFactory.build({
			content: {
				isAnonymous: false,
				questions: [
					{
						id: "q1",
						text: "Frage eins",
						answerMode: PollAnswerMode.SINGLE,
						chartType: PollChartType.BAR,
						options: [
							{ id: "o1", text: "A" },
							{ id: "o2", text: "B" },
						],
					},
					{
						id: "q2",
						text: "Frage zwei",
						answerMode: PollAnswerMode.SINGLE,
						chartType: PollChartType.BAR,
						options: [{ id: "o3", text: "C" }],
					},
				],
				...overrides,
			},
		});

	const voters: PollVoterResponse[] = [
		{ userId: "u1", firstName: "Anna", answers: [{ questionId: "q1", selectedOptionIds: ["o1"] }] },
	];

	const setupWrapper = (options: {
		element?: PollElement;
		isEditor?: boolean;
		pollState?: { results?: unknown; voters?: PollVoterResponse[] };
		modelValue?: boolean;
	}) => {
		getStateMock.mockReturnValue(options.pollState ?? { results: [], voters: undefined });

		const wrapper = mount(PollAnalysisDialog, {
			attachTo: document.body,
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: {
				element: options.element ?? buildElement(),
				isEditor: options.isEditor ?? true,
				modelValue: options.modelValue ?? true,
			},
		});

		return { wrapper };
	};

	afterEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = "";
	});

	const body = () => new DOMWrapper(document.body);

	const activeNavItems = () =>
		body()
			.findAll("[data-testid^='poll-analysis-nav-item-']")
			.filter((item) => item.classes().includes("v-list-item--active"));

	it("selects only one nav entry at a time, and clicking a later entry deselects the previous one", async () => {
		setupWrapper({ pollState: { results: [], voters } });

		expect(activeNavItems()).toHaveLength(1);
		expect(body().find("[data-testid='poll-analysis-nav-item-overview']").classes()).toContain("v-list-item--active");

		await body().find("[data-testid='poll-analysis-nav-item-question:q2']").trigger("click");

		const active = activeNavItems();
		expect(active).toHaveLength(1);
		expect(active[0].attributes("data-testid")).toBe("poll-analysis-nav-item-question:q2");
	});

	it("moves selection with arrow keys", async () => {
		setupWrapper({ pollState: { results: [], voters } });

		await body().trigger("keydown", { key: "ArrowRight" });

		expect(body().find("[data-testid='poll-analysis-nav-item-question:q1']").classes()).toContain(
			"v-list-item--active"
		);
	});

	it("ignores arrow keys when focus is inside a text input", async () => {
		const input = document.createElement("input");
		document.body.appendChild(input);
		input.focus();

		setupWrapper({ pollState: { results: [], voters } });

		input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
		await nextTick();
		await flushPromises();

		expect(body().find("[data-testid='poll-analysis-nav-item-overview']").classes()).toContain("v-list-item--active");

		document.body.removeChild(input);
	});

	it("resets selection to overview if the current entry disappears from a recomputed entries list", async () => {
		const { wrapper } = setupWrapper({ pollState: { results: [], voters } });

		await body().find("[data-testid='poll-analysis-nav-item-participants']").trigger("click");
		expect(body().find("[data-testid='poll-analysis-nav-item-participants']").classes()).toContain(
			"v-list-item--active"
		);

		// Voters disappearing (e.g. becoming anonymous) makes the participants entry vanish.
		await wrapper.setProps({ element: buildElement({ isAnonymous: true }) });

		expect(body().find("[data-testid='poll-analysis-nav-item-overview']").classes()).toContain("v-list-item--active");
		expect(body().find("[data-testid='poll-analysis-nav-item-participants']").exists()).toBe(false);
	});

	it("never renders a participants nav entry or any participant name for a student view, even if voters happen to be present in the store", () => {
		setupWrapper({
			isEditor: false,
			pollState: { results: [], voters },
		});

		expect(body().find("[data-testid='poll-analysis-nav-item-participants']").exists()).toBe(false);
		expect(body().text()).not.toContain("Anna");
	});

	it("never renders a participants nav entry for an anonymous poll, even for an editor with voters present", () => {
		setupWrapper({
			element: buildElement({ isAnonymous: true }),
			isEditor: true,
			pollState: { results: [], voters },
		});

		expect(body().find("[data-testid='poll-analysis-nav-item-participants']").exists()).toBe(false);
	});
});
