export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

export type DeviceRegistrationStatus =
  | 'registered'
  | 'permission_denied'
  | 'not_a_device'
  | 'no_token'
  | 'error';

export type PushPayload = {
  conversationId: string;
  conversationType: 'direct' | 'group';
};

export const NOTIFICATION_POLICY_LABELS: Record<NotificationPolicy, string> = {
  all_group_messages: 'Todas as mensagens do grupo',
  mentioned_members: 'Somente quem for mencionado',
  direct_messages_only: 'Somente conversas individuais',
  disabled: 'Desativadas',
};

export const NOTIFICATION_POLICIES: NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];
