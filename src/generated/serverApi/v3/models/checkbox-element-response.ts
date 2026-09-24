import { ContentElementType } from './content-element-type';
import { TimestampsResponse } from './timestamps-response';
import { BoardRoles } from './board-roles';
import { PollAudience } from './poll-audience';

export interface CheckboxElementResponse {
    id: string;
    type: ContentElementType;
    content: { text: string; requireTeacherConfirmation: boolean; audience: PollAudience; audienceRoles?: BoardRoles[] };
    timestamps: TimestampsResponse;
}