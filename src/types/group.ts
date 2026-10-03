import type { NotificationPolicy } from './notification';

export type ChatGroup = {
  id: string;
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

export type CreateGroupInput = {
  id: string;
  name: string;
  photoUri: string | null;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

export type UpdateGroupInput = {
  name?: string;
  photoUri?: string | null;
  memberLimit?: number;
  notificationPolicy?: NotificationPolicy;
};
