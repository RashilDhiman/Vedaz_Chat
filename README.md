# Vedaz Chat

Real-time mobile chat. The React Native app sends and receives messages through a Node.js server. Socket.io pushes each new message to everyone in the room, and SQLite keeps the history so it is still there after a refresh.

## Features

- Username login with no password
- Send and receive messages instantly over Socket.io
- Chat history loaded from a REST API, including after the app restarts
- Timestamps and day labels
- Typing indicator
- Online presence
- Sent, delivered, and read status
- Messages stored in SQLite

## Project structure

```
backend/                 Express + Socket.io server
  src/config             Environment
  src/controllers        HTTP handlers
  src/db                 SQLite setup
  src/middleware         Auth and errors
  src/routes             REST routes
  src/services           Users, messages, presence
  src/socket             Real-time events
  scripts/smoke.js       API and socket check
mobile/                  React Native CLI app
  src/components         Bubbles, list, composer, typing
  src/context            Chat state, socket, and history
  src/screens            Login and chat
  src/services           REST and Socket.io clients
  src/storage            Saved username session
```

## Prerequisites

- Node.js 22 or newer
- npm
- For the Android app: JDK 17, Android Studio, and an emulator or device
- For the iOS app: Xcode, CocoaPods (`bundle install` then `bundle exec pod install` inside `mobile/ios`)

## Environment variables

Copy the example file before starting the server:

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | HTTP and Socket.io port |
| `NODE_ENV` | `development` | Runtime mode |
| `DB_PATH` | `./data/chat.db` | SQLite file, created on first start |
| `CORS_ORIGIN` | `*` | Allowed browser origins. Mobile clients do not send an origin. |

The phone app reads its server address from `mobile/src/config/env.ts`.

| Where the app runs | Host to use |
| --- | --- |
| Android emulator | `10.0.2.2` (already the Android default) |
| iOS simulator | `localhost` (already the iOS default) |
| Physical phone | Your computer's LAN IP, such as `192.168.1.20` |

Change `DEV_HOST` in that file, then reload the app. The phone and the computer need to be on the same network, and the server must listen on `0.0.0.0` (Express does this by default when you call `listen(port)`).

## Run the backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

For restart-on-save during development:

```bash
npm run dev
```

Health check: [http://localhost:4000/api/health](http://localhost:4000/api/health)

With the server running, you can verify REST history and a live Socket.io delivery:

```bash
npm run smoke
```

## Run the frontend

Install dependencies once:

```bash
cd mobile
npm install
```

Start Metro in one terminal:

```bash
npm start
```

Android, in a second terminal:

```bash
cd mobile
npm run android
```

iOS, after CocoaPods are installed:

```bash
cd mobile/ios
bundle install
bundle exec pod install
cd ..
npm run ios
```

`@react-native-async-storage/async-storage` is a native module. After the first install, run the app again with `npm run android` or `npm run ios` so the native project picks it up.

## REST API

All message routes expect `Authorization: Bearer <token>` from login.

| Method | Path | Body / query | Result |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | `{ ok: true }` |
| `POST` | `/api/auth/login` | `{ "username": "Asha" }` | `{ token, user, created }` |
| `GET` | `/api/messages` | `limit`, optional `before` (unix ms) | Latest page, oldest first |
| `POST` | `/api/messages` | `{ "text": "Hello" }` | Stores the message and broadcasts it |
| `GET` | `/api/users/online` | — | Users with a live socket |

`POST /api/messages` and the `send_message` socket event both save through the same service. A successful REST send is also emitted on Socket.io, so other clients update immediately.

## Socket.io events

Connect with `auth: { token }`.

| Event | Direction | Payload |
| --- | --- | --- |
| `ready` | server → sender | Current user and online list |
| `presence` | server → others | Online users after join or leave |
| `send_message` | client → server | `{ text, clientId }` with an ack |
| `new_message` | server → room | Stored message |
| `typing` | both | `{ isTyping }` in, `{ typingUsers }` out |
| `message_receipt` | client → server | `{ messageId, status: "delivered" \| "read" }` |
| `message_status` | server → room | `{ id, status }` |
| `error_message` | server → sender | `{ message }` when a send fails |

Disconnects clear that socket's typing state and broadcast the updated presence list. The client reconnects on its own. If the socket is down, the app falls back to `POST /api/messages`.

## Design decisions

- One shared room, `general`, matches the brief: every connected user sees the same conversation.
- The app sends over the socket so delivery does not wait on a refresh. History still comes from REST, which is what a cold start and pull-to-refresh use.
- SQLite (via `better-sqlite3`) keeps messages on disk without a separate database server. The file lives at `backend/data/chat.db`.
- Login is a username only. The same name returns the same token, so a person can leave and come back to their history.
- Receipts move forward only: sent, then delivered, then read. The sender sees that label on their own bubbles.
- The interface is a dark Vedaz room: night background, gold accents, name avatars, and written sent, delivered, and read states. It is not styled as a copy of another messenger.

## Assumptions

- Everyone chats in the single General room. There are no private threads or room list.
- Usernames are 2–20 characters: letters, numbers, and underscores. There is no password.
- "Read" means at least one other person had the chat open. It is not a per-person checklist.
- The newest 50 messages load first. Earlier messages load from the button at the top of the thread.
- Local development uses HTTP. Android cleartext is enabled so the emulator can reach the machine. A production host should use HTTPS, and cleartext should be turned off.
- A free Render or Railway deploy has an ephemeral disk, so the SQLite file is wiped on restart unless you attach a persistent disk. The API shape stays the same.

## Deploying the backend

The server is a standard Node process.

1. Push this repository. `render.yaml` at the root is a Render blueprint for the API, with a disk so SQLite survives restarts.
2. On Render or Railway, set the root directory to `backend` if you are not using the blueprint.
3. Build command: `npm install`
4. Start command: `npm start`
5. Set `DB_PATH` if you mount a disk. The host sets `PORT`.
6. Put the public `https://…` URL into `apiUrl` and `socketUrl` in `mobile/src/config/env.ts`.

No live URL is included here because hosting needs your own Render or Railway account.

## Android APK

A debug APK can be built once the Android SDK is installed:

```bash
cd mobile/android
./gradlew assembleDebug
```

The file is written to `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. A copy of that debug build is also at `VedazChat-debug.apk` in the project root. Install it on a device or emulator with:

```bash
adb install -r VedazChat-debug.apk
```

## Troubleshooting

- **Cannot reach the server.** Confirm `npm start` is running in `backend` and that `DEV_HOST` matches the emulator, simulator, or LAN IP.
- **Android cannot connect, iOS can.** Use `10.0.2.2`, not `localhost`, on the Android emulator.
- **Session expired.** Leave the room and enter the same username again. The token is stored in SQLite.
- **History is empty on a new machine.** The database file is local to the server you are running.
