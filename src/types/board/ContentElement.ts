import {
	AiQuestionElementResponse,
	AssignmentElementResponse,
	CheckboxElementResponse,
	CollaborativeTextEditorElementResponse,
	ContentElementType,
	DrawingElementResponse,
	ExternalToolElementResponse,
	FileAreaLinkElementResponse,
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
export type FileAreaLinkElement = FileAreaLinkElementResponse;

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
	| AiQuestionElementResponse
	| FileAreaLinkElementResponse;

export type ParentNodeInfo = ParentNodeInfoResponse;

export { ContentElementType, ParentNodeType };
