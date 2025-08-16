# Alleato Visual Architecture Guide

## 🗺️ System Mind Map

```
                                    🏗️ ALLEATO AI CHAT
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                │                          │                          │
           🖥️ FRONTEND                🔧 BACKEND              📊 INFRASTRUCTURE
                │                          │                          │
    ┌───────────┼───────────┐    ┌────────┼────────┐       ┌────────┼────────┐
    │           │           │    │        │        │       │        │        │
 📱 UI      🧩 LOGIC    🎨 STYLE  🚀 API  💾 DATA  🔒 AUTH  ☁️ EDGE  💿 STORAGE 🔌 SERVICES
    │           │           │    │        │        │       │        │        │
    ├─Chat      ├─Hooks     ├─CSS   ├─REST   ├─D1     ├─JWT    ├─Workers ├─R2     ├─OpenAI
    ├─Files     ├─Context   ├─Theme ├─Routes ├─Schema ├─Session├─KV      ├─Blob   ├─Redis
    ├─Editor    ├─SDK       └─Icons ├─Stream └─Query  └─Roles  └─DO      └─CDN    └─Email
    └─Artifacts └─Utils            └─WebSocket
```

## 🎯 Component Interaction Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  Login  │ │  Chat   │ │  Files  │ │ Editor  │ │ Profile │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
│       │           │           │           │           │         │
│       └───────────┴───────────┴───────────┴───────────┘         │
│                               │                                  │
│                        🔗 ALLEATO SDK                           │
│                               │                                  │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                          [HTTP/HTTPS]
                                │
┌───────────────────────────────┼─────────────────────────────────┐
│                         CLOUDFLARE EDGE                          │
│                               │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    WORKERS RUNTIME                       │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │   │
│  │  │  Auth   │  │  Chat   │  │  Files  │  │ Streams │   │   │
│  │  │ Service │  │ Service │  │ Service │  │ Service │   │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘   │   │
│  │       │            │            │            │          │   │
│  └───────┼────────────┼────────────┼────────────┼──────────┘   │
│          │            │            │            │               │
│  ┌───────▼───┐ ┌──────▼───┐ ┌─────▼────┐ ┌────▼─────┐        │
│  │    D1     │ │    KV    │ │    R2    │ │ Durable  │        │
│  │ Database  │ │  Store   │ │  Storage │ │ Objects  │        │
│  └───────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Request Flow Diagrams

### 🔐 Authentication Flow
```
👤 User
   │
   ├─[Login Request]──→ 🖥️ Frontend
   │                      │
   │                      ├─[Validate Input]
   │                      │
   │                      └─[API Call]──→ ☁️ Worker
   │                                        │
   │                                        ├─[Check Credentials]──→ 💾 D1
   │                                        │
   │                                        ├─[Create Session]────→ 🗄️ KV
   │                                        │
   │                                        └─[Return JWT]
   │                                              │
   └←─────────────[Authenticated]─────────────────┘
```

### 💬 Chat Message Flow
```
👤 User Types Message
         │
         ▼
   📱 Chat Interface
         │
         ├─[Format Message]
         │
         └──→ 🔗 SDK.sendMessage()
                    │
                    └──→ ☁️ Worker API
                              │
                              ├─[Validate]
                              ├─[Save to D1]
                              ├─[Call OpenAI]
                              │     │
                              │     └─[Stream Response]
                              │
                              └──→ 📡 SSE Stream
                                        │
                                        ▼
                                  📱 Update UI
```

### 📁 File Upload Flow
```
👤 Select File
      │
      ▼
📱 File Input ──→ 🔍 Validate (Size/Type)
      │                    │
      │                    ▼
      │              📦 FormData
      │                    │
      └────────────────────┼──→ ☁️ Worker
                                    │
                                    ├─[Auth Check]
                                    ├─[Process File]
                                    ├─[Store in R2]──→ 💿 R2 Bucket
                                    ├─[Save Metadata]─→ 💾 D1
                                    │
                                    └─[Return URL]
                                          │
                                          ▼
                                    📱 Display File
```

## 🏗️ Service Architecture

### Frontend Services
```
┌─────────────────────────────────────────────────┐
│                  NEXT.JS APP                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐        ┌──────────────┐     │
│  │   PAGES      │        │  COMPONENTS  │     │
│  │  ┌────────┐  │        │  ┌────────┐  │     │
│  │  │ /chat  │  │◄──────►│  │ <Chat> │  │     │
│  │  │ /auth  │  │        │  │ <File> │  │     │
│  │  │ /docs  │  │        │  │ <User> │  │     │
│  │  └────────┘  │        │  └────────┘  │     │
│  └──────────────┘        └──────────────┘     │
│         ▲                        ▲             │
│         │                        │             │
│         ▼                        ▼             │
│  ┌──────────────┐        ┌──────────────┐     │
│  │    HOOKS     │        │   CONTEXT    │     │
│  │  useChat()   │        │  AuthContext │     │
│  │  useFiles()  │        │  ChatContext │     │
│  │  useAuth()   │        │  ThemeContext│     │
│  └──────────────┘        └──────────────┘     │
│         │                        │             │
│         └────────┬───────────────┘             │
│                  ▼                             │
│           ┌──────────────┐                     │
│           │  ALLEATO SDK │                     │
│           │   Unified    │                     │
│           │     API      │                     │
│           └──────────────┘                     │
└─────────────────────────────────────────────────┘
```

### Backend Services
```
┌─────────────────────────────────────────────────┐
│              CLOUDFLARE WORKERS                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────┐    ┌─────────────────┐   │
│  │   MIDDLEWARE    │    │    SERVICES     │   │
│  ├─────────────────┤    ├─────────────────┤   │
│  │ • Auth Guard    │───►│ • AuthService   │   │
│  │ • Rate Limit    │    │ • ChatService   │   │
│  │ • CORS          │    │ • FileService   │   │
│  │ • Error Handler │    │ • StreamService │   │
│  └─────────────────┘    └─────────────────┘   │
│           │                      │             │
│           ▼                      ▼             │
│  ┌─────────────────────────────────────────┐  │
│  │              STORAGE LAYER               │  │
│  ├─────────────────────────────────────────┤  │
│  │   D1 SQL    │    KV Store   │    R2     │  │
│  │ • Users     │ • Sessions    │ • Files   │  │
│  │ • Chats     │ • Streams     │ • Images  │  │
│  │ • Messages  │ • Cache       │ • Docs    │  │
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 🎨 Component Hierarchy

```
<App>
  │
  ├─<AuthProvider>
  │   │
  │   ├─<Layout>
  │   │   │
  │   │   ├─<Header>
  │   │   │   ├─<Logo>
  │   │   │   ├─<Navigation>
  │   │   │   └─<UserMenu>
  │   │   │
  │   │   ├─<Sidebar>
  │   │   │   ├─<ChatList>
  │   │   │   ├─<NewChatButton>
  │   │   │   └─<Settings>
  │   │   │
  │   │   └─<Main>
  │   │       │
  │   │       └─<ChatInterface>
  │   │           ├─<MessageList>
  │   │           │   └─<Message>
  │   │           │       ├─<Avatar>
  │   │           │       ├─<Content>
  │   │           │       └─<Actions>
  │   │           │
  │   │           └─<InputArea>
  │   │               ├─<TextInput>
  │   │               ├─<FileUpload>
  │   │               └─<SendButton>
  │   │
  │   └─<Modals>
  │       ├─<LoginModal>
  │       ├─<SettingsModal>
  │       └─<FilePreview>
  │
  └─<ErrorBoundary>
```

## 📦 Data Models

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    USER     │     │    CHAT     │     │   MESSAGE   │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id          │────►│ id          │────►│ id          │
│ email       │     │ userId      │     │ chatId      │
│ password    │     │ title       │     │ role        │
│ type        │     │ visibility  │     │ content     │
│ createdAt   │     │ createdAt   │     │ parts       │
└─────────────┘     └─────────────┘     │ attachments │
        │                   │            │ createdAt   │
        │                   │            └─────────────┘
        ▼                   ▼
┌─────────────┐     ┌─────────────┐
│  DOCUMENT   │     │   STREAM    │
├─────────────┤     ├─────────────┤
│ id          │     │ id          │
│ userId      │     │ chatId      │
│ title       │     │ data        │
│ content     │     │ createdAt   │
│ type        │     └─────────────┘
│ createdAt   │
└─────────────┘
```

## 🚦 Status Indicators

### System Health Dashboard
```
┌────────────────────────────────────────────────────────┐
│                    SYSTEM STATUS                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Frontend:     🟢 Operational   [Next.js on Vercel]   │
│  Backend API:  🟢 Operational   [Workers Edge]        │
│  Database:     🟢 Operational   [D1 + PostgreSQL]     │
│  File Storage: 🟢 Operational   [R2 Buckets]          │
│  AI Service:   🟢 Operational   [OpenAI API]          │
│  Cache Layer:  🟢 Operational   [KV Namespaces]       │
│                                                        │
│  Latency:      ⚡ 12ms avg                            │
│  Uptime:       📈 99.99%                              │
│  Requests:     📊 1.2M/day                            │
│                                                        │
└────────────────────────────────────────────────────────┘
```

This visual documentation provides multiple ways to understand the Alleato architecture - from high-level system maps to detailed component hierarchies and data flows!