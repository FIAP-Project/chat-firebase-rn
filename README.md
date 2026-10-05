# 💬 Chat Firebase — React Native (Expo) + API de Push

Aplicativo de chat **individual e em grupo** em React Native + TypeScript, com Firebase (Authentication, Realtime Database, Firestore e Storage) e notificações push enviadas por uma **API própria publicada na internet** (sem Cloud Functions).

## 👥 Integrantes

|------|----|
| Felipe Cerboncini Cordeiro | 554909 |
| Pedro Henrique Martins Alves dos Santos | 558107 |
| Milena Codinhoto da Silva | 554682 |

---

## ⚠️ Avisos importantes para a correção

### 1. A API pode estar "dormindo" (plano gratuito do Render)

A API de notificações está hospedada no **plano gratuito do Render**. Nesse plano, o serviço **entra em repouso após cerca de 15 minutos sem receber requisições**. A **primeira chamada depois do repouso pode levar de 30 a 60 segundos** para acordar a API.

**Efeito prático:** se a API estiver dormindo, a **primeira mensagem enviada pode não gerar a notificação push**, porque o app desiste da requisição depois de alguns segundos. O app mostra o aviso amarelo *"Mensagem enviada, mas a notificação push não pôde ser disparada"*. A mensagem em si **é salva normalmente** no Realtime Database.

**Como evitar antes de testar o push:**

1. Abra no navegador: **`https://chat-firebase-rn.onrender.com/`**
2. Aguarde a resposta `{"status":"ok", ...}` (pode demorar até 1 minuto na primeira vez).
3. A partir daí a API está acordada e as notificações funcionam normalmente. Se o aviso amarelo apareceu, é só enviar outra mensagem.

> A API foi publicada para ficar disponível durante a correção. Se a primeira tentativa falhar por causa do repouso, repetir após o `/health` responder resolve.

### 2. Use Java 21 (JDK 21) para compilar o app Android

Este projeto deve ser compilado com **Java 21**. Outras versões do JDK (por exemplo, 17, 24 ou 25) podem causar erros de build do Gradle no `expo run:android` e no `expo prebuild`. Detalhes em [Pré-requisitos](#-pré-requisitos).

> Os builds feitos **na nuvem** pelo EAS (`eas build`) usam o JDK do próprio EAS. O Java 21 só importa para quem compila **localmente**.

### 3. Push exige aparelho físico e development build

- As notificações push **não funcionam no Expo Go** nem em emulador. Teste em **dispositivo físico Android** com o development build (ou o APK `preview`).
- O funcionamento completo das notificações **não depende do Expo Go**.

---

## 🧰 Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| **Java (JDK)** | **21** | Obrigatório para compilar o Android localmente. Veja como conferir abaixo |
| **Node.js** | 20 ou superior | A API exige `>=20` |
| **Android Studio / Android SDK** | atual | Necessário só para `expo run:android` local |
| **EAS CLI** | `>= 16` | `npm i -g eas-cli` (builds na nuvem) |
| **Firebase CLI** | atual | `npm i -g firebase-tools` (publicar regras) |

### Conferindo e configurando o Java 21

```bash
java -version      # deve mostrar versão 21.x
```

Se mostrar outra versão, instale o JDK 21 e aponte o `JAVA_HOME`:

```powershell
# Windows (PowerShell) — ajuste o caminho do seu JDK 21
setx JAVA_HOME "C:\Program Files\Java\jdk-21"
# feche e reabra o terminal, depois confirme:
java -version
```

```bash
# macOS
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# Linux (exemplo)
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
```

Para ver qual JDK o Gradle está usando (depois do `expo prebuild`): `cd android && ./gradlew --version` (no Windows: `gradlew.bat --version`).

---

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
| Hospedagem da API | Render (plano gratuito; arquivo `render.yaml`) |
| Armazenamento de fotos | **Firebase Storage** (somente a URL é salva no Firestore) |
| Java | **21** (build Android local) |

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
google-services.json           # identifica o app Android (não é segredo)
firestore.rules · database.rules.json · storage.rules · firebase.json
.env.example                   # variáveis do app (sem valores reais)
src/
  components/  Avatar, Button, ChatInput, ChatMessage, ConversationItem,
               GroupMemberItem, UserPicker, TextField, Loading, ErrorMessage
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
docs/screenshots/              # prints para este README
```

## 🚀 Instalação e execução (app)

```bash
java -version                 # confirme Java 21
npm install
cp .env.example .env          # defina EXPO_PUBLIC_API_URL (URL da API)
npm run typecheck             # deve terminar sem erros
npx expo prebuild             # gera android/ e ios/
npm run android               # compila e instala o development build no aparelho
npm start                     # inicia o Metro para o development build
```

> Com o aparelho em **modo desenvolvedor e depuração USB** ativos. O `npm run android` instala o development build; depois o `npm start` serve o JavaScript.

### Build na nuvem (sem precisar de Java/Android SDK locais)

```bash
eas login
eas build --profile development --platform android   # development build
eas build --profile preview --platform android        # APK instalável direto
```

**Link do APK / build para teste:** `PREENCHER — https://expo.dev/accounts/cerbon/projects/chat-firebase-rn/builds/...`

## 🔑 Variáveis de ambiente

| Onde | Arquivo | Variáveis (nomes) |
|---|---|---|
| App | `.env` (a partir de `.env.example`) | `EXPO_PUBLIC_API_URL`, `EAS_PROJECT_ID` |
| API | `server/.env` (local) ou segredos da hospedagem | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`, `PORT` |

Os arquivos `.env` **não são versionados**. Os `.env.example` trazem apenas valores fictícios. A URL da API também fica no `eas.json`, porque o `.env` não é enviado ao EAS Build (a URL é pública).

## 🔧 Configuração do Firebase

1. Crie um projeto no [console do Firebase](https://console.firebase.google.com).
2. **Authentication → Sign-in method:** habilite **somente E-mail/Senha**.
3. Crie o **Firestore** e o **Realtime Database** (anote a `databaseURL`) e ative o **Storage**.
4. Em *Configurações do projeto → Seus apps → Web*, copie o `firebaseConfig` para **`firebaseConfig.json`** (apenas a config do SDK cliente).
5. Adicione o app **Android** (package `br.com.fiap.chatfirebase`) e baixe o **`google-services.json`** para a raiz.
6. Publique as regras versionadas neste repositório:
   ```bash
   npm i -g firebase-tools && firebase login
   firebase use <seu-project-id>
   firebase deploy --only firestore:rules,database,storage
   ```

## 🖼️ Fotos (Firebase Storage)

As imagens são escolhidas com `expo-image-picker` (permissão da galeria solicitada e tratada) e enviadas ao **Firebase Storage**:

- Foto de perfil: `profiles/{uid}/…`
- Foto de grupo: `groupPhotos/{ownerUid}/{groupId}/…`

**Somente a URL final** é gravada no Firestore (nada de Base64). Sem foto, ou se ela falhar ao carregar, o `Avatar` mostra uma imagem padrão (inicial/ícone). As regras do Storage limitam o tamanho a 5 MB e o tipo a `image/*`.

## 🔔 Notificações push — Android e iOS

1. `eas login` → `eas init` (vincula o `projectId`, já configurado em `app.config.js`).
2. **Android:** o `google-services.json` (na raiz, versionado) é detectado pelo `app.config.js`. Envie a **chave de conta de serviço FCM V1** ao EAS: `eas credentials` → Android → *Google Service Account Key for FCM V1* (ou em expo.dev → Credentials). Sem essa chave o Expo responde `InvalidCredentials`.
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

Em **conversa individual**, o outro participante sempre é notificado.

Regras gerais (aplicadas **no servidor**):

- o remetente nunca é notificado e só integrantes entram na lista;
- o texto do push é **genérico de propósito** (“Você recebeu uma nova mensagem”) para não expor o conteúdo da conversa; o título traz o nome do remetente ou do grupo;
- a API consulta os **recibos do Expo** (`getReceipts`) e **desativa tokens inválidos** (`DeviceNotRegistered`).

## 🌐 API online (`server/`)

**Tecnologia:** Node.js + Express + TypeScript + Firebase Admin SDK. Envio via Expo Push Service (FCM no Android / APNs no iOS).

**URL pública:** `https://chat-firebase-rn.onrender.com/`
**Health check:** `GET /health` → `{ "status": "ok" }`

> 💤 **Plano gratuito:** a API dorme após ~15 min sem uso e a primeira chamada leva 30–60 s. Veja o [aviso no topo](#️-avisos-importantes-para-a-correção). Para acordá-la, abra o `/health`.

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

**Publicar no Render:** *New → Web Service* com *Root Directory* `server`, build `npm install && npm run build`, start `npm start` e *Health Check Path* `/health` (ou *New → Blueprint* usando o `render.yaml`). Cadastre as variáveis acima em *Environment*. Gere a conta de serviço em *Firebase → Configurações → Contas de serviço → Gerar nova chave privada* e copie os campos para as variáveis. **Nunca** versione o JSON da conta de serviço.

## 👥 Limite de integrantes e concorrência

- `memberLimit` (inteiro 2–256, **inclui o proprietário**) é definido na criação e editável pelo proprietário; não pode ficar menor que o número atual de integrantes.
- A UI mostra integrantes/vagas e desabilita ações sem vaga, **mas a proteção real está no servidor**:
  1. **Regras do Firestore** (`validGroup`): `memberIds.size() <= memberLimit` em toda criação/atualização.
  2. **Transações do Firestore** (`runTransaction` em `addMember`, `updateGroup`, `removeMember`): o documento é relido e a operação é **repetida automaticamente** se houver escrita concorrente; assim duas entradas simultâneas nunca ultrapassam o limite (a segunda enxerga o grupo cheio e falha).
- Somente o proprietário altera grupo/integrantes (regra `ownerId == request.auth.uid`).

## 🔒 Segurança e decisões de arquitetura

- **Dois bancos, uma fonte de verdade:** o Firestore é a fonte dos integrantes; o Realtime Database mantém um **espelho** (`conversations/{id}/members`) escrito somente pelo proprietário (grupos) ou pelos dois participantes (conversa individual, ID `uidA_uidB`). As regras do RTDB não conseguem ler o Firestore, então usam esse espelho para garantir que só integrantes **leem e enviam** mensagens, que `senderId == auth.uid`, que o texto e os campos sejam válidos, e que um usuário removido perca acesso às novas mensagens.
- **Dados cadastrais:** `users/{uid}` é público (nome/foto) para busca; e-mail/celular/nascimento ficam em `users/{uid}/private/profile`, legíveis só pelo dono. Outros usuários os obtêm por `GET /users/:uid/profile`, validado na API (regras não conseguem consultar “grupos em comum”).
- **Tokens de push** (`users/{uid}/devices`) são privados; o log de idempotência só é acessível pelo Admin SDK.
- **Segredos:** credenciais administrativas existem **apenas** nas variáveis secretas da API. `firebaseConfig.json` e `google-services.json` identificam o projeto/app e não concedem acesso administrativo.
- Regras: [`firestore.rules`](firestore.rules), [`database.rules.json`](database.rules.json), [`storage.rules`](storage.rules).

> Limitação conhecida: a escrita do espelho no RTDB ocorre logo após a transação do Firestore (duas operações). Se a segunda falhar por rede, repetir a ação conserta o estado; uma evolução seria a API executar as duas escritas.

## 🧪 Roteiro de teste para a correção

Use **dois aparelhos** (ou um físico e um emulador) com contas diferentes. As contas podem ser criadas pelo próprio app.

1. **Acorde a API:** abra `https://chat-firebase-rn.onrender.com/` e aguarde `{"status":"ok"}`.
2. **Cadastro e sessão:** crie duas contas (com foto), feche e reabra o app (a sessão é recuperada).
3. **Conversa individual:** *Nova conversa* → escolha o outro usuário → envie mensagens (chegam em tempo real). Toque na foto do cabeçalho para ver o perfil.
4. **Grupo e limite:** crie um grupo com limite **3**, adicione integrantes até lotar e tente adicionar mais um (deve ser recusado).
5. **Políticas de push:** como proprietário, alterne a política (`all_group_messages`, `mentioned_members`, `direct_messages_only`, `disabled`) e envie mensagens, com e sem menção. Com o app do destinatário **fechado**, confira se a notificação chega (e que o remetente não recebe a própria).
6. **Toque na notificação:** abre a conversa correta.
7. **Remoção:** remova um integrante; ele deixa de receber novas mensagens do grupo.
8. **Logout:** volta ao Login e as conversas deixam de ser acessíveis.

## 🗺️ Requisitos do enunciado × onde estão

| Requisito | Onde |
|---|---|
| Auth e-mail/senha, sessão, logout | `authService.ts`, `AuthContext.tsx`, `firebase.ts` |
| Mensagens em tempo real (RTDB) | `chatService.ts`, `useChat.ts` |
| Perfis, grupos, tokens (Firestore) | `userService.ts`, `groupService.ts`, `notificationService.ts` |
| Limite de integrantes + concorrência | `groupService.ts` (transações), `firestore.rules` |
| Push pela API própria, destinatários no servidor | `server/src/routes/notifications.ts`, `recipientResolver.ts`, `notificationSender.ts` |
| Idempotência do push | `notificationLog` (criado com `create()`) |
| Regras de segurança | `firestore.rules`, `database.rules.json`, `storage.rules` |
| Hooks, componentização, tipagem sem `any` | `src/hooks`, `src/components`, `src/types` |

## 📸 Prints e evidências

<!-- PREENCHER: adicione as imagens em docs/screenshots/ e troque o texto pelo link da imagem -->
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
