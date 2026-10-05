# 💬 Chat Firebase — React Native (Expo) + API de Push

Aplicativo de chat **individual e em grupo** em React Native + TypeScript, com Firebase (Authentication, Realtime Database, Firestore e Storage) e notificações push enviadas por uma **API própria publicada na internet** (sem Cloud Functions).

> ⚠️ **Antes de entregar, preencha os itens marcados com `PREENCHER`** (integrantes, URL da API, prints e `firebaseConfig.json`). Veja a seção [Checklist de entrega](#-checklist-de-entrega).

## 👥 Integrantes

<!-- PREENCHER: nome completo e RM de TODOS os integrantes (máx. 5). Sem isso o trabalho recebe nota zero. -->
- RMXXXXX — Nome Completo do Integrante 1
- RMXXXXX — Nome Completo do Integrante 2

## 🧰 Tecnologias

| Item | Versão / escolha |
|---|---|
| Expo SDK | **57** (≥ 55 exigido) |
| React Native / React | 0.86 / 19.2 |
| TypeScript | 5.9 (`strict`, **sem `any`**) |
| Navegação | React Navigation (native-stack) |
| Firebase JS SDK | 12.x (Auth, Firestore, Realtime Database, Storage) |
| Push no app | `expo-notifications` + development build (`expo-dev-client`) |
| API | **Node.js + Express + TypeScript** (`server/`) + Firebase Admin SDK |
| Hospedagem da API | Render (arquivo `render.yaml`) — qualquer host HTTPS serve |
| Armazenamento de fotos | **Firebase Storage** (somente a URL é salva no Firestore) |

## 🔥 Responsabilidade de cada serviço

| Serviço | Uso |
|---|---|
| **Authentication** | Cadastro/login **somente e-mail e senha**, recuperação de sessão (AsyncStorage), `uid`, logout |
| **Realtime Database** | Mensagens (`messages/{conversationId}/{messageId}`), listeners em tempo real e espelho de integrantes (`conversations/{id}/members`) usado nas regras |
| **Cloud Firestore** | Perfis (`users`), dados cadastrais protegidos (`users/{uid}/private/profile`), tokens (`users/{uid}/devices`), grupos (integrantes, `memberLimit`, `notificationPolicy`), conversas individuais, log de idempotência do push |
| **Firebase Storage** | Foto de perfil e foto do grupo |
| **FCM** | Entrega do push no Android (via Expo Push Service com credencial FCM V1) e APNs no iOS |

## 🗂️ Estrutura

```
App.tsx · index.ts · app.config.js · eas.json
firebaseConfig.json            # config do SDK cliente (sem segredos)
firestore.rules · database.rules.json · storage.rules · firebase.json
src/
  components/  Avatar, Button, ChatInput, ChatMessage, ConversationItem,
               GroupMemberItem, UserPicker, Loading, ErrorMessage, TextField
  screens/     Login, Register, Conversations, Users, GroupForm, Chat,
               GroupMembers, Profile
  services/    firebase, authService, userService, groupService, chatService,
               notificationService, storageService, apiService
  hooks/       useAuth, useUsers, useGroups, useConversations, useChat, useNotifications
  contexts/    AuthContext
  navigation/  rootNavigation (abre a conversa ao tocar no push)
  types/       user, chat, group, notification, navigation
  utils/       conversationId, groupValidation, errors, parsing, pickImage, theme
server/
  src/app.ts · middleware/authenticate.ts
  src/routes/notifications.ts · routes/profiles.ts
  src/services/firebaseAdmin.ts · notificationSender.ts · recipientResolver.ts
  Dockerfile · render.yaml · .env.example
```

## 🚀 Instalação e execução (app)

```bash
npm install
cp .env.example .env          # defina EXPO_PUBLIC_API_URL e EAS_PROJECT_ID
npm run typecheck             # deve terminar sem erros
npx expo prebuild             # gera android/ e ios/
npm run android               # ou: npm run ios   (development build em aparelho físico)
npm start                     # inicia o Metro para o development build
```

> Push **não funciona no Expo Go**: use development build (`expo run:android|ios`) ou build do EAS.

## 🔧 Configuração do Firebase

1. Crie um projeto no [console do Firebase](https://console.firebase.google.com).
2. **Authentication → Sign-in method:** habilite **somente E-mail/Senha**.
3. Crie o **Firestore** e o **Realtime Database** (anote a `databaseURL`) e ative o **Storage**.
4. Em *Configurações do projeto → Seus apps → Web*, copie o `firebaseConfig` para **`firebaseConfig.json`** (apenas a config do SDK cliente).
5. Publique as regras versionadas neste repositório:
   ```bash
   npm i -g firebase-tools && firebase login
   firebase use <seu-project-id>
   firebase deploy --only firestore:rules,database,storage
   ```

## 🖼️ Fotos (Firebase Storage)

As imagens são escolhidas com `expo-image-picker` (permissão da galeria solicitada e tratada), enviadas ao **Firebase Storage** (`profiles/{uid}/…` e `groupPhotos/{ownerUid}/{groupId}/…`) e **somente a URL** é gravada no Firestore. Sem foto, ou se ela falhar ao carregar, o `Avatar` mostra uma imagem padrão (inicial/ícone).

## 🔔 Notificações push — Android e iOS

1. `eas login` → `eas init` (gera o `projectId`; coloque em `EAS_PROJECT_ID`).
2. **Android:** adicione o app Android no Firebase (package `br.com.fiap.chatfirebase`), baixe o **`google-services.json`** para a raiz do projeto (o `app.config.js` o detecta) e envie a **chave de conta de serviço FCM V1** ao EAS: `eas credentials` → Android → *Google Service Account Key for FCM V1*. O `google-services.json` é versionado no repositório (identifica o app, não é segredo). Build nativo: `eas build --profile development|preview --platform android`.
3. **iOS:** requer conta Apple Developer. `eas credentials` cria/gerencia a chave **APNs**. Build: `eas build --profile development --platform ios`.
4. Teste em **dispositivo físico**. O token é gravado em `users/{uid}/devices/{deviceId}`; no logout ele é desativado.
5. Ao tocar na notificação, o `payload` (`conversationId`, `conversationType`) abre a conversa correta (app aberto, em segundo plano ou fechado).

### Políticas de notificação (definidas pelo proprietário, por grupo)

| Política | Quem recebe |
|---|---|
| `all_group_messages` | Mensagem **geral** → todos os integrantes (exceto o remetente). Mensagem **direcionada** a um integrante → apenas ele e os mencionados |
| `mentioned_members` | Somente integrantes mencionados ou selecionados como alvo |
| `direct_messages_only` | Grupos não geram push; apenas conversas individuais |
| `disabled` | Nenhum push do grupo |

Regras gerais (aplicadas **no servidor**): o remetente nunca é notificado; só integrantes entram; o texto do push é GENÉRICO de propósito ("Você recebeu uma nova mensagem") para não expor o conteúdo. A API confere os recibos do Expo (`getReceipts`) e desativa tokens inválidos (`DeviceNotRegistered`).

## 🌐 API online (`server/`)

**Tecnologia:** Node.js + Express + TypeScript + Firebase Admin SDK. Envio via Expo Push Service (FCM no Android / APNs no iOS).

**URL pública:** `<URL_DA_API>`
**Health check:** `GET /health` → `{ "status": "ok" }`

| Endpoint | Descrição |
|---|---|
| `GET /health` | Disponibilidade da API |
| `POST /notifications/messages` | `Authorization: Bearer <ID token>` · corpo `{ conversationId, messageId }`. Valida o token, confirma a mensagem no Realtime Database e o remetente, calcula destinatários (Firestore + política), garante idempotência e envia o push |
| `GET /users/:uid/profile` | Dados cadastrais (e-mail, celular, nascimento) **somente** se houver conversa individual ou grupo em comum |

A API **não confia em lista de destinatários** vinda do app. Reenvios da mesma requisição não duplicam push: o documento `notificationLog/{conversationId}_{messageId}` é criado com `create()` (falha se já existir).

### Configurar, executar e publicar

```bash
cd server
npm install
cp .env.example .env   # somente local; NÃO versionar
npm run dev            # http://localhost:3000/health
```

**Variáveis (apenas os NOMES; valores só nos segredos da hospedagem):** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`, `PORT`.

**Publicar no Render:** *New → Blueprint* apontando para este repositório (`render.yaml`) ou *Web Service* com *Root Directory* `server`, build `npm install && npm run build`, start `npm start`. Cadastre as variáveis acima em *Environment*. Gere a conta de serviço em *Firebase → Configurações → Contas de serviço → Gerar nova chave privada* e copie os campos para as variáveis — **nunca** commite o JSON. Confirme `GET /health` e use um plano que não “adormeça” durante a correção.

## 👥 Limite de integrantes e concorrência

- `memberLimit` (inteiro 2–256, **inclui o proprietário**) é definido na criação e editável pelo proprietário; não pode ficar menor que o número atual de integrantes.
- A UI mostra integrantes/vagas e desabilita ações sem vaga, **mas a proteção real está no servidor**:
  1. **Regras do Firestore** (`validGroup`): `memberIds.size() <= memberLimit` em toda criação/atualização.
  2. **Transações do Firestore** (`runTransaction` em `addMember`, `updateGroup`, `removeMember`): o documento é relido e a operação é **repetida automaticamente** se houver escrita concorrente; assim duas entradas simultâneas nunca ultrapassam o limite (a segunda enxerga o grupo cheio e falha).
- Somente o proprietário altera grupo/integrantes (regra `ownerId == request.auth.uid`).

## 🔒 Segurança e decisões de arquitetura

- **Dois bancos, uma fonte de verdade:** o Firestore é a fonte dos integrantes; o Realtime Database mantém um **espelho** (`conversations/{id}/members`) escrito somente pelo proprietário (grupos) ou pelos dois participantes (conversa individual, ID `uidA_uidB`). As regras do RTDB não conseguem ler o Firestore, então usam esse espelho para: só integrantes **leem/enviam**, `senderId == auth.uid`, `createdAt == now`, e usuário removido perde acesso às novas mensagens.
- **Dados cadastrais:** `users/{uid}` é público (nome/foto) para busca; e-mail/celular/nascimento ficam em `users/{uid}/private/profile`, legíveis só pelo dono. Outros usuários os obtêm por `GET /users/:uid/profile`, validado na API (regras não conseguem consultar “grupos em comum”).
- **Tokens de push** (`users/{uid}/devices`) são privados; o log de idempotência só é acessível pelo Admin SDK.
- Credenciais administrativas existem **apenas** nas variáveis secretas da API. `firebaseConfig.json` contém só a config do SDK cliente.
- Regras: [`firestore.rules`](firestore.rules), [`database.rules.json`](database.rules.json), [`storage.rules`](storage.rules).

> Limitação conhecida: a escrita do espelho no RTDB ocorre logo após a transação do Firestore (duas operações). Se a segunda falhar por rede, repetir a ação conserta o estado; uma evolução seria a API executar as duas escritas.

## ✅ Checklist de entrega

- [ ] Nome e RM de todos os integrantes (acima)
- [ ] `firebaseConfig.json` com os dados reais do **seu** projeto
- [ ] Regras publicadas (`firebase deploy …`)
- [ ] API publicada com HTTPS e segredos configurados; URL preenchida neste README e em `EXPO_PUBLIC_API_URL`
- [ ] `google-services.json`/APNs configurados e push testado em aparelho físico
- [ ] Prints em `docs/screenshots/` e links abaixo
- [ ] Repositório acessível + URL da API enviados pelo Teams

## 📸 Prints e evidências

<!-- PREENCHER: adicione as imagens em docs/screenshots/ -->
| Tela | Print |
|---|---|
| Login / Cadastro | `docs/screenshots/login.png` |
| Conversas | `docs/screenshots/conversas.png` |
| Chat em grupo | `docs/screenshots/chat-grupo.png` |
| Formulário de grupo (limite/política) | `docs/screenshots/grupo-form.png` |
| Perfil | `docs/screenshots/perfil.png` |
| **Notificação recebida** | `docs/screenshots/push.png` |

## 📚 Referências
[Expo](https://docs.expo.dev/) · [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) · [Firebase Auth](https://firebase.google.com/docs/auth) · [Realtime Database](https://firebase.google.com/docs/database) · [Firestore](https://firebase.google.com/docs/firestore) · [Admin SDK](https://firebase.google.com/docs/admin/setup) · [Expo Push](https://docs.expo.dev/push-notifications/sending-notifications/)
