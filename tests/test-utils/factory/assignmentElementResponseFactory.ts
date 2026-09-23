import { timestampsResponseFactory } from "./timestampsResponseFactory";
import { AssignmentElementContentPeerReviewMode, AssignmentElementResponse, ContentElementType, InputFormat } from "@api-server";
import { Factory } from "fishery";

export const assignmentElementResponseFactory = Factory.define<AssignmentElementResponse>(({ sequence }) => ({
	id: `assignment-element-response-${sequence}`,
	type: ContentElementType.ASSIGNMENT,
	content: {
		title: `Assignment ${sequence}`,
		text: "Please submit your work.",
		inputFormat: InputFormat.PLAIN_TEXT,
		startDate: null,
		dueDate: null,
		graceMinutes: null,
		maxPoints: 10,
		lateUntil: null,
		peerReviewEnabled: false,
		peerReviewMode: AssignmentElementContentPeerReviewMode.MANUAL,
		peerReviewCount: 1,
	},
	timestamps: timestampsResponseFactory.build(),
}));
