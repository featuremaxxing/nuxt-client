import PollParticipantsTable from "./PollParticipantsTable.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { PollAnswerMode, PollChartType, PollQuestionResponse, PollVoterResponse } from "@api-server";
import { mount } from "@vue/test-utils";

describe("PollParticipantsTable", () => {
	const questions: PollQuestionResponse[] = [
		{
			id: "q1",
			text: "Wie fandet ihr die Stunde?",
			answerMode: PollAnswerMode.MULTIPLE,
			chartType: PollChartType.BAR,
			options: [
				{ id: "o1", text: "Gut" },
				{ id: "o2", text: "Spannend" },
			],
		},
		{
			id: "q2",
			text: "Was hat gefehlt?",
			answerMode: PollAnswerMode.TEXT,
			chartType: PollChartType.BAR,
			options: [],
		},
	];

	const setupWrapper = (voters: PollVoterResponse[]) =>
		mount(PollParticipantsTable, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { questions, voters },
		});

	it("shows the resolved name for a voter with a first/last name", () => {
		const wrapper = setupWrapper([{ userId: "u1", firstName: "Anna", lastName: "Beispiel", answers: [] }]);

		expect(wrapper.find("[data-testid='poll-participant-name']").text()).toBe("Anna Beispiel");
	});

	it("falls back to the unknown-user placeholder, never the raw userId, when no name is present", () => {
		const wrapper = setupWrapper([{ userId: "some-raw-id", answers: [] }]);

		const nameCell = wrapper.find("[data-testid='poll-participant-name']");
		expect(nameCell.text()).not.toContain("some-raw-id");
		expect(nameCell.text().length).toBeGreaterThan(0);
	});

	it("joins multi-select answers with a comma from the selected options' texts", () => {
		const wrapper = setupWrapper([
			{
				userId: "u1",
				firstName: "Anna",
				answers: [{ questionId: "q1", selectedOptionIds: ["o1", "o2"] }],
			},
		]);

		const cells = wrapper.findAll("td");
		expect(cells[1].text()).toBe("Gut, Spannend");
	});

	it("shows a free-text answer verbatim", () => {
		const wrapper = setupWrapper([
			{
				userId: "u1",
				firstName: "Anna",
				answers: [{ questionId: "q2", selectedOptionIds: [], textAnswer: "Mehr Beispiele" }],
			},
		]);

		const cells = wrapper.findAll("td");
		expect(cells[2].text()).toBe("Mehr Beispiele");
	});

	it("shows an em dash for a missing answer", () => {
		const wrapper = setupWrapper([{ userId: "u1", firstName: "Anna", answers: [] }]);

		const cells = wrapper.findAll("td");
		expect(cells[1].text()).toBe("–");
		expect(cells[2].text()).toBe("–");
	});

	it("shows the empty state when there are no voters", () => {
		const wrapper = setupWrapper([]);

		expect(wrapper.find("[data-testid='poll-participants-empty']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='poll-participants-table']").exists()).toBe(false);
	});
});
