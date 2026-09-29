import { BoardProgress } from "./board-progress-api";
import { aggregateStudentProgress } from "./student-progress";

const board = (overrides: Partial<BoardProgress> = {}): BoardProgress => ({
	boardId: "board-1",
	boardTitle: "Board 1",
	isTeacherView: true,
	summary: { done: 0, total: 0 },
	items: [
		{
			type: "checkbox",
			elementId: "el-1",
			cardId: "card-1",
			title: "Lesen",
			eligible: false,
			done: false,
			doneCount: 1,
			eligibleCount: 2,
			students: [
				{ userId: "anna", firstName: "Anna", lastName: "A", done: true },
				{ userId: "bob", firstName: "Bob", lastName: "B", done: false },
			],
		},
		{
			type: "assignment",
			elementId: "el-2",
			cardId: "card-2",
			title: "Aufsatz",
			dueDate: "2026-10-01T00:00:00.000Z",
			eligible: false,
			done: false,
			doneCount: 2,
			eligibleCount: 2,
			students: [
				{ userId: "anna", firstName: "Anna", lastName: "A", done: true },
				{ userId: "bob", firstName: "Bob", lastName: "B", done: true },
			],
		},
	],
	...overrides,
});

describe("aggregateStudentProgress", () => {
	it("counts done and total items per student across all items", () => {
		const rows = aggregateStudentProgress([board()]);

		expect(rows.find((row) => row.userId === "anna")).toMatchObject({ done: 2, total: 2, openItems: [] });
		expect(rows.find((row) => row.userId === "bob")).toMatchObject({ done: 1, total: 2 });
	});

	it("lists the open items of a student with a deep-linkable board and card", () => {
		const bob = aggregateStudentProgress([board()]).find((row) => row.userId === "bob");

		expect(bob?.openItems).toEqual([
			{
				boardId: "board-1",
				boardTitle: "Board 1",
				cardId: "card-1",
				elementId: "el-1",
				type: "checkbox",
				title: "Lesen",
				dueDate: undefined,
			},
		]);
	});

	it("sums up across several boards", () => {
		const rows = aggregateStudentProgress([board(), board({ boardId: "board-2", boardTitle: "Board 2" })]);

		expect(rows.find((row) => row.userId === "bob")).toMatchObject({ done: 2, total: 4 });
	});

	it("puts the students furthest behind first", () => {
		const rows = aggregateStudentProgress([board()]);

		expect(rows.map((row) => row.userId)).toEqual(["bob", "anna"]);
	});

	it("ignores boards shown in the student view", () => {
		expect(aggregateStudentProgress([board({ isTeacherView: false })])).toEqual([]);
	});
});
