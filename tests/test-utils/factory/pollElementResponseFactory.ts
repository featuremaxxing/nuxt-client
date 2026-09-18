import { ContentElementType, PollAnswerMode, PollChartType, PollElementResponse, PollStatus } from "@api-server";
import { Factory } from "fishery";
import { timestampsResponseFactory } from "./timestampsResponseFactory";

export const pollElementResponseFactory = Factory.define<PollElementResponse>(({ sequence }) => ({
	id: `poll-element-response-${sequence}`,
	type: ContentElementType.POLL,
	content: {
		title: `Poll ${sequence}`,
		isAnonymous: false,
		showResultsLive: false,
		pollStatus: PollStatus.DRAFT,
		questions: [
			{
				id: `question-${sequence}-1`,
				text: "How was the lesson?",
				answerMode: PollAnswerMode.SINGLE,
				chartType: PollChartType.BAR,
				options: [
					{ id: `option-${sequence}-1`, text: "Good" },
					{ id: `option-${sequence}-2`, text: "Okay" },
				],
			},
		],
	},
	timestamps: timestampsResponseFactory.build(),
}));
