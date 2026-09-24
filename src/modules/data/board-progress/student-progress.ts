import { BoardProgress, ProgressElementType } from "./board-progress-api";

export interface StudentOpenItem {
	boardId: string;
	boardTitle: string;
	cardId: string;
	elementId: string;
	type: ProgressElementType;
	title: string;
	dueDate?: string;
}

export interface StudentProgress {
	userId: string;
	firstName?: string;
	lastName?: string;
	done: number;
	total: number;
	openItems: StudentOpenItem[];
}

// Turns the per-item student breakdown of the teacher view (?details=true) into one row per
// student: how many of the items they are eligible for they have completed, and which are
// still open. Only boards shown in the teacher view carry a breakdown - others are skipped.
// Sorted with the students furthest behind first, so the table answers "who needs help".
export const aggregateStudentProgress = (boards: BoardProgress[]): StudentProgress[] => {
	const byUserId = new Map<string, StudentProgress>();

	for (const board of boards) {
		if (!board.isTeacherView) continue;

		for (const item of board.items) {
			for (const student of item.students ?? []) {
				let row = byUserId.get(student.userId);
				if (!row) {
					row = {
						userId: student.userId,
						firstName: student.firstName,
						lastName: student.lastName,
						done: 0,
						total: 0,
						openItems: [],
					};
					byUserId.set(student.userId, row);
				}

				row.total += 1;
				if (student.done) {
					row.done += 1;
				} else {
					row.openItems.push({
						boardId: board.boardId,
						boardTitle: board.boardTitle,
						cardId: item.cardId,
						elementId: item.elementId,
						type: item.type,
						title: item.title,
						dueDate: item.dueDate,
					});
				}
			}
		}
	}

	const ratio = (row: StudentProgress) => (row.total > 0 ? row.done / row.total : 1);
	const name = (row: StudentProgress) => `${row.lastName ?? ""} ${row.firstName ?? ""}`.trim();

	return [...byUserId.values()].sort((a, b) => ratio(a) - ratio(b) || name(a).localeCompare(name(b)));
};
