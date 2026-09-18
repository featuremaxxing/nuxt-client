import { ContentElementType } from "./ContentElement";
import { PollAnswerMode, PollChartType, PollStatus } from "@api-server";
import { z } from "zod";

const ExternalToolElementContentSchema = z.object({
	contextExternalToolId: z.string().nullable(),
});

export const FileElementContentSchema = z.object({
	caption: z.string(),
	alternativeText: z.string(),
});

const FileFolderElementContentSchema = z.object({
	title: z.string(),
});

const H5pElementContentSchema = z.object({
	contentId: z.string().nullable(),
});

const LinkElementContentSchema = z.object({
	url: z.string(),
	title: z.string(),
	description: z.string().optional(),
	originalImageUrl: z.string().optional(),
	imageUrl: z.string().optional(),
});

const RichTextElementContentSchema = z.object({
	text: z.string(),
	inputFormat: z.string(),
});

const DrawingElementContentSchema = z.object({
	description: z.string(),
});

const DeletedElementContentSchema = z.object({
	title: z.string(),
	deletedElementType: z.enum(ContentElementType),
	description: z.string().optional(),
});

const VideoConferenceElementContentSchema = z.object({
	title: z.string(),
});

const CollaborativeTextEditorElementContentSchema = z.object({});

const PollOptionSchema = z.object({
	id: z.string(),
	text: z.string(),
});

const PollQuestionSchema = z.object({
	id: z.string(),
	text: z.string(),
	answerMode: z.enum(PollAnswerMode),
	chartType: z.enum(PollChartType),
	options: z.array(PollOptionSchema),
});

const PollElementContentSchema = z.object({
	title: z.string().optional(),
	questions: z.array(PollQuestionSchema),
	isAnonymous: z.boolean(),
	showResultsLive: z.boolean(),
	pollStatus: z.enum(PollStatus),
	closesAt: z.string().optional(),
	resultSnapshot: z
		.object({
			frozenAt: z.string(),
			participantCount: z.number(),
			perQuestion: z.array(
				z.object({
					questionId: z.string(),
					counts: z.array(z.object({ optionId: z.string(), count: z.number() })),
					textAnswers: z.array(z.string()).optional(),
				})
			),
		})
		.optional(),
});

export const AnyContentElementSchema = z.object({
	id: z.string(),
	type: z.enum(ContentElementType),
	timestamps: z.object({
		createdAt: z.string(),
		lastUpdatedAt: z.string(),
	}),
	content: z.union([
		ExternalToolElementContentSchema,
		FileElementContentSchema,
		FileFolderElementContentSchema,
		H5pElementContentSchema,
		LinkElementContentSchema,
		RichTextElementContentSchema,
		DrawingElementContentSchema,
		DeletedElementContentSchema,
		VideoConferenceElementContentSchema,
		CollaborativeTextEditorElementContentSchema,
		PollElementContentSchema,
	]),
});
