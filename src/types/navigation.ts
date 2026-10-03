import type { ConversationType } from './chat';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Conversations: undefined;
  Users: undefined;
  GroupForm: { groupId?: string } | undefined;
  Chat: { conversationId: string; conversationType: ConversationType };
  GroupMembers: { groupId: string };
  Profile: { uid: string };
};
