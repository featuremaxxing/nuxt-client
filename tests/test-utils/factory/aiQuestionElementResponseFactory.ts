import { timestampsResponseFactory } from "@@/tests/test-utils/factory/timestampsResponseFactory";
import {
	AiQuestionElementResponse,
	ContentElementType,
} from "@api-server";
import { Factory } from "fishery";

export const aiQuestionElementResponseFactory = Factory.define<AiQuestionElementResponse>(({ sequence }) => ({
	id: `ai-question-element-response-${sequence}`,
	type: ContentElementType.AI_QUESTION,
	content: {
		question: `Was ist 2+2? (Frage ${sequence})`,
		allowMultipleAttempts: false,
	},
	timestamps: timestampsResponseFactory.build(),
}));
