import { buildPollResultsCsv } from "./poll-export.util";
import {
	PollAnswerMode,
	PollAudience,
	PollChartType,
	PollElementContent,
	PollStatus,
	PollVoterResponse,
} from "@api-server";

describe("poll-export.util", () => {
	describe("buildPollResultsCsv", () => {
		const poll: PollElementContent = {
			title: "Feedback",
			isAnonymous: true,
			showResultsLive: false,
			pollStatus: PollStatus.CLOSED,
			audience: PollAudience.STUDENTS,
			allowVoteChange: false,
			questions: [
				{
					id: "q1",
					text: "Wie fandet ihr die Stunde?",
					answerMode: PollAnswerMode.SINGLE,
					chartType: PollChartType.BAR,
					options: [
						{ id: "o1", text: "Gut" },
						{ id: "o2", text: "Ging so" },
					],
				},
				{
					id: "q2",
					text: "Was hat gefehlt?",
					answerMode: PollAnswerMode.TEXT,
					chartType: PollChartType.BAR,
					options: [],
				},
			],
		};

		it("builds one row per option plus the header row, with counts and percentages", () => {
			const csv = buildPollResultsCsv(poll, {
				participantCount: 10,
				perQuestion: [
					{
						questionId: "q1",
						counts: [
							{ optionId: "o1", count: 8 },
							{ optionId: "o2", count: 2 },
						],
					},
					{ questionId: "q2", counts: [], textAnswers: ["mehr Beispiele"] },
				],
			});

			const expected = [
				"Frage;Option;Anzahl;Prozent",
				"Wie fandet ihr die Stunde?;Gut;8;80%",
				"Wie fandet ihr die Stunde?;Ging so;2;20%",
				"Was hat gefehlt?;mehr Beispiele;1;100%",
			].join("\n");

			expect(csv).toBe(expected);
		});

		it("uses 0% instead of dividing by zero when a question has no votes", () => {
			const csv = buildPollResultsCsv(poll, {
				participantCount: 0,
				perQuestion: [
					{
						questionId: "q1",
						counts: [
							{ optionId: "o1", count: 0 },
							{ optionId: "o2", count: 0 },
						],
					},
					{ questionId: "q2", counts: [], textAnswers: [] },
				],
			});

			const expected = [
				"Frage;Option;Anzahl;Prozent",
				"Wie fandet ihr die Stunde?;Gut;0;0%",
				"Wie fandet ihr die Stunde?;Ging so;0;0%",
				"Was hat gefehlt?;;0;0%",
			].join("\n");

			expect(csv).toBe(expected);
		});

		it("appends an individual-answers block for non-anonymous polls with voter data", () => {
			const nonAnonymousPoll: PollElementContent = { ...poll, isAnonymous: false };
			const voters: PollVoterResponse[] = [
				{
					userId: "u1",
					firstName: "Anna",
					lastName: "Beispiel",
					answers: [
						{ questionId: "q1", selectedOptionIds: ["o1"] },
						{ questionId: "q2", selectedOptionIds: [], textAnswer: "Tempo" },
					],
				},
			];

			const csv = buildPollResultsCsv(
				nonAnonymousPoll,
				{
					participantCount: 1,
					perQuestion: [
						{
							questionId: "q1",
							counts: [
								{ optionId: "o1", count: 1 },
								{ optionId: "o2", count: 0 },
							],
						},
						{ questionId: "q2", counts: [], textAnswers: ["Tempo"] },
					],
				},
				voters
			);

			expect(csv).toContain("Einzelantworten");
			expect(csv).toContain("Name;Frage;Antwort");
			expect(csv).toContain("Anna Beispiel;Wie fandet ihr die Stunde?;Gut");
			expect(csv).toContain("Anna Beispiel;Was hat gefehlt?;Tempo");
			// A raw userId must never leak into the export as the displayed name.
			expect(csv).not.toContain("u1;");
		});

		it("falls back to a neutral placeholder (never the raw userId) when a voter has no name", () => {
			const nonAnonymousPoll: PollElementContent = { ...poll, isAnonymous: false };
			const voters: PollVoterResponse[] = [
				{ userId: "u1", answers: [{ questionId: "q1", selectedOptionIds: ["o1"] }] },
			];

			const csv = buildPollResultsCsv(
				nonAnonymousPoll,
				{
					participantCount: 1,
					perQuestion: [{ questionId: "q1", counts: [{ optionId: "o1", count: 1 }] }],
				},
				voters
			);

			expect(csv).toContain("Unbekannte Person;Wie fandet ihr die Stunde?;Gut");
			expect(csv).not.toContain("u1;");
		});

		it("omits the individual-answers block for anonymous polls even if voter data is passed", () => {
			const voters: PollVoterResponse[] = [
				{ userId: "u1", answers: [{ questionId: "q1", selectedOptionIds: ["o1"] }] },
			];

			const csv = buildPollResultsCsv(
				poll,
				{
					participantCount: 1,
					perQuestion: [{ questionId: "q1", counts: [{ optionId: "o1", count: 1 }] }],
				},
				voters
			);

			expect(csv).not.toContain("Einzelantworten");
		});

		it("quotes fields that contain the delimiter", () => {
			const pollWithSemicolon: PollElementContent = {
				...poll,
				questions: [
					{
						id: "q1",
						text: "A; B?",
						answerMode: PollAnswerMode.SINGLE,
						chartType: PollChartType.BAR,
						options: [{ id: "o1", text: "Ja" }],
					},
				],
			};

			const csv = buildPollResultsCsv(pollWithSemicolon, {
				participantCount: 1,
				perQuestion: [{ questionId: "q1", counts: [{ optionId: "o1", count: 1 }] }],
			});

			expect(csv).toContain('"A; B?"');
		});

		it("neutralizes a formula-injection payload in a free-text answer", () => {
			const pollWithTextQuestion: PollElementContent = {
				...poll,
				questions: [
					{
						id: "q1",
						text: "Anything else?",
						answerMode: PollAnswerMode.TEXT,
						chartType: PollChartType.BAR,
						options: [],
					},
				],
			};

			const csv = buildPollResultsCsv(pollWithTextQuestion, {
				participantCount: 1,
				perQuestion: [{ questionId: "q1", counts: [], textAnswers: ['=cmd|"/c calc"!A1'] }],
			});

			// still legible as the original text (quoted, not stripped) but no longer parsed as a
			// formula by a spreadsheet app opening the export
			expect(csv).toContain("'=cmd");
			expect(csv).not.toContain('"=cmd');
		});

		it("neutralizes a formula-injection payload in a non-anonymous voter's name", () => {
			const voters: PollVoterResponse[] = [
				{
					userId: "u1",
					firstName: "=1+1",
					lastName: "Berger",
					answers: [{ questionId: "q1", selectedOptionIds: ["o1"] }],
				},
			];

			const csv = buildPollResultsCsv(
				{ ...poll, isAnonymous: false },
				{
					participantCount: 1,
					perQuestion: [{ questionId: "q1", counts: [{ optionId: "o1", count: 1 }] }],
				},
				voters
			);

			expect(csv).toContain("'=1+1 Berger");
		});
	});
});
