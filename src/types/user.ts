/** Dados públicos (Firestore: users/{uid}) */
export type PublicProfile = {
  uid: string;
  name: string;
  photoUrl: string;
  createdAt: number;
};

/** Dados cadastrais protegidos (Firestore: users/{uid}/private/profile) */
export type PrivateProfile = {
  email: string;
  phoneNumber: string;
  birthDate: string;
};

export type ChatUser = PublicProfile & PrivateProfile;

/** Perfil exibido na tela de perfil; campos privados podem estar indisponíveis. */
export type ViewedProfile = PublicProfile & Partial<PrivateProfile>;

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  birthDate: string;
  photoUri: string | null;
};
