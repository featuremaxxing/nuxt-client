import {
	AiQuestionElementResponse,
	AssignmentElementResponse,
	CollaborativeTextEditorElementResponse,
	CheckboxElementResponse,
	ContentElementType,
	DrawingElementResponse,
	ExternalToolElementResponse,
	FileElementResponse,
	FileFolderElementResponse,
	H5pElementResponse,
	LinkElementResponse,
	ParentNodeInfoResponse,
	ParentNodeType,
	PollElementResponse,
	RichTextElementResponse,
	VideoConferenceElementResponse,
} from "@api-server";

export type FileFolderElement = FileFolderElementResponse;
export type PollElement = PollElementResponse;
export type CheckboxElement = CheckboxElementResponse;
export type AssignmentElement = AssignmentElementResponse;
export type AiQuestionElement = AiQuestionElementResponse;

export type AnyContentElement =
	| LinkElementResponse
	| RichTextElementResponse
	| FileElementResponse
	| FileFolderElementResponse
	| ExternalToolElementResponse
	| DrawingElementResponse
	| CollaborativeTextEditorElementResponse
	| VideoConferenceElementResponse
	| H5pElementResponse
	| PollElementResponse
	| CheckboxElementResponse
	| AssignmentElementResponse
	| AiQuestionElementResponse;

export type ParentNodeInfo = ParentNodeInfoResponse;

export { ContentElementType, ParentNodeType };
