# Content Orchestrator Backend

> 📖 **Este é um documento de documentação** do sistema Content Orchestrator.

Sistema completo de orquestração de conteúdo para automação de publicação multi-plataforma. Desenvolvido em Python com FastAPI, integrado ao Supabase (PostgreSQL) e controlado via n8n para workflows automatizados.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Stack Tecnológico](#stack-tecnológico)
- [Modelos de Dados](#modelos-de-dados)
- [Fluxo de Trabalho](#fluxo-de-trabalho)
- [API Endpoints](#api-endpoints)
- [Integração com n8n](#integração-com-n8n)
- [Configuração](#configuração)
- [Deploy](#deploy)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Exemplos de Uso](#exemplos-de-uso)

---

## 🎯 Visão Geral

O **Content Orchestrator** é um sistema backend que automatiza o processo completo de:
1. **Descoberta** de conteúdo de múltiplas fontes (YouTube, Instagram, TikTok, etc.)
2. **Seleção inteligente** de conteúdo baseada em regras e nichos
3. **Download** organizado por grupos e fontes
4. **Reserva e deduplicação** para evitar conflitos
5. **Rastreamento** de publicações e logs

O sistema é projetado para trabalhar em conjunto com **n8n**, que orquestra os workflows e chama os endpoints da API em intervalos configurados.

### Características Principais

- ✅ **Organização por Grupos (Nichos)**: Conteúdo organizado por categorias (ex: Culinária, Finanças, Tecnologia)
- ✅ **Multi-plataforma**: Suporte para YouTube, Instagram, TikTok e extensível para outras
- ✅ **Deduplicação Inteligente**: Evita conteúdo duplicado usando hash SHA256 e IDs externos
- ✅ **Reserva de Conteúdo**: Sistema de reserva temporária para evitar conflitos em publicações simultâneas
- ✅ **Idempotência**: Garante que requisições duplicadas retornem o mesmo resultado
- ✅ **Background Tasks**: Processamento assíncrono de fetch e download
- ✅ **Armazenamento Organizado**: Downloads organizados por `grupo/fonte/video_id.mp4`

---

## 🏗️ Arquitetura

```
┌─────────────────┐
│      n8n        │  ← Orquestra workflows e chama API
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────────────────────────┐
│   Content Orchestrator (FastAPI)   │
│  ┌───────────────────────────────┐  │
│  │   API Endpoints               │  │
│  │   - /v1/n8n/*                 │  │
│  │   - /v1/fetch/*               │  │
│  │   - /v1/select                │  │
│  │   - /v1/download/*            │  │
│  │   - /v1/confirm_publish/*     │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │   Services                    │  │
│  │   - FetcherService            │  │
│  │   - SelectorService           │  │
│  │   - DownloaderService         │  │
│  │   - BackgroundTasks           │  │
│  └───────────────────────────────┘  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│      Supabase (PostgreSQL)          │
│  - Groups, Sources, Destinations     │
│  - ContentItems, Jobs, PublishLogs  │
└─────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Local Storage (downloads/)         │
│   downloads/                         │
│   ├── grupo1/                        │
│   │   ├── fonte1/                   │
│   │   │   └── video_id.mp4          │
│   │   └── fonte2/                   │
│   └── grupo2/                        │
└─────────────────────────────────────┘
```

### Componentes Principais

1. **API Layer (FastAPI)**: Endpoints REST para comunicação com n8n
2. **Service Layer**: Lógica de negócio isolada (Fetcher, Selector, Downloader)
3. **Background Tasks**: Processamento assíncrono de jobs pesados
4. **Database Layer (Supabase)**: Armazenamento persistente com SQLModel/PostgreSQL
5. **Storage Layer**: Sistema de arquivos local organizado por grupo/fonte

---

## 🛠️ Stack Tecnológico

| Componente | Tecnologia | Versão | Propósito |
|------------|-----------|--------|-----------|
| **Framework** | FastAPI | 0.100+ | API REST assíncrona |
| **ORM** | SQLModel | Latest | Modelagem e acesso ao banco |
| **Database** | PostgreSQL (Supabase) | - | Banco de dados principal |
| **Async Driver** | asyncpg | Latest | Driver assíncrono PostgreSQL |
| **Video Download** | yt-dlp | Latest | Download de vídeos de múltiplas plataformas |
| **HTTP Client** | httpx | Latest | Requisições HTTP assíncronas |
| **Config** | pydantic-settings | Latest | Gerenciamento de configurações |
| **Container** | Docker | - | Containerização |
| **Orchestration** | Docker Compose | - | Orquestração de containers |

---

## 📊 Modelos de Dados

### Diagrama de Relacionamentos

```
┌──────────┐
│  Group   │ (Nichos: Culinária, Finanças, etc.)
└────┬─────┘
     │ 1:N
     │
     ├─────────────────┐
     │                 │
     ▼                 ▼
┌──────────┐      ┌──────────────┐
│  Source  │      │ Destination  │ (Canais de destino)
└────┬─────┘      └──────┬───────┘
     │ 1:N               │ 1:N
     │                   │
     ▼                   ▼
┌──────────────────────────────┐
│      ContentItem             │
│  - external_video_id         │
│  - content_hash (SHA256)     │
│  - storage_path              │
│  - status                    │
│  - reserved_until            │
│  - reserved_by_destination_id│
└──────┬───────────────────────┘
       │ 1:N
       ▼
┌──────────────┐
│ PublishLog   │ (Histórico de publicações)
└──────────────┘
```

### Modelos Detalhados

#### 1. Group (Grupo/Nicho)
Representa uma categoria de conteúdo (ex: "Culinária", "Finanças", "Tecnologia").

```python
{
    "id": "uuid",
    "name": "Culinária",              # Nome único do grupo
    "description": "Receitas e dicas", # Descrição opcional
    "status": "active",                # active | inactive
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

**Relacionamentos:**
- 1:N com `Source` (múltiplas fontes por grupo)
- 1:N com `Destination` (múltiplos destinos por grupo)

#### 2. Source (Fonte de Conteúdo)
Representa um canal/fonte de onde o conteúdo será extraído.

```python
{
    "id": "uuid",
    "platform": "youtube",            # youtube | instagram | tiktok
    "external_id": "@ShortsPodcuts",   # ID/username do canal
    "group_id": "uuid",                # FK para Group
    "status": "active",                 # active | inactive
    "license_status": "licensed",      # Status de licenciamento (opcional)
    "niche": "Culinária",              # Mantido para compatibilidade
    "created_at": "datetime"
}
```

**Exemplo de URLs construídas:**
- YouTube: `https://www.youtube.com/@{external_id}/shorts`
- Instagram: `https://www.instagram.com/{external_id}/`
- TikTok: `https://www.tiktok.com/@{external_id}`

#### 3. Destination (Destino de Publicação)
Representa um canal/contas onde o conteúdo será publicado.

```python
{
    "id": "uuid",
    "platform": "youtube",             # youtube | instagram | tiktok
    "account_id": "@MeuCanal",          # ID/username do canal de destino
    "group_id": "uuid",                # FK para Group (etiqueta/nicho)
    "daily_limit": 1,                   # Limite diário de publicações
    "status": "active",                 # active | inactive
    "niche": "Culinária",              # Mantido para compatibilidade
    "created_at": "datetime"
}
```

#### 4. ContentItem (Item de Conteúdo)
Representa um vídeo/conteúdo descoberto e gerenciado pelo sistema.

```python
{
    "id": "uuid",
    "platform": "youtube",
    "external_video_id": "dQw4w9WgXcQ",  # ID único do vídeo na plataforma
    "source_id": "uuid",                  # FK para Source
    "published_at": "datetime",            # Data de publicação original
    "content_hash": "sha256...",          # Hash SHA256 do arquivo (após download)
    "storage_path": "/app/downloads/...", # Caminho do arquivo baixado
    "status": "discovered",                # discovered | downloaded | published | error
    "reserved_until": "datetime",         # Data de expiração da reserva
    "reserved_by_destination_id": "uuid", # FK para Destination (quem reservou)
    "created_at": "datetime"
}
```

**Estados do ContentItem:**
- `discovered`: Conteúdo descoberto, mas não baixado
- `downloaded`: Conteúdo baixado e pronto para publicação
- `published`: Conteúdo já publicado
- `error`: Erro durante processamento

**Sistema de Reserva:**
- Quando um conteúdo é selecionado, é reservado por 30 minutos
- `reserved_until`: Data/hora de expiração da reserva
- `reserved_by_destination_id`: Qual destino reservou o conteúdo

#### 5. Job (Job de Processamento)
Rastreia jobs assíncronos de fetch e download.

```python
{
    "id": "uuid",
    "type": "fetch",                    # fetch | download | n8n_fetch_all
    "status": "pending",                # pending | running | completed | failed
    "retries": 0,                       # Número de tentativas
    "error_message": "string",          # Mensagem de erro (se falhou)
    "created_at": "datetime"
}
```

#### 6. PublishLog (Log de Publicação)
Registra todas as tentativas de publicação.

```python
{
    "id": "uuid",
    "destination_id": "uuid",          # FK para Destination
    "content_item_id": "uuid",          # FK para ContentItem
    "published_at": "datetime",         # Quando foi publicado
    "platform_post_id": "string",       # ID do post na plataforma (opcional)
    "result": "success"                 # success | error
}
```

#### 7. IdempotencyKey (Chave de Idempotência)
Garante que requisições duplicadas retornem o mesmo resultado.

```python
{
    "id": "uuid",
    "key": "uuid",                      # Chave de idempotência
    "destination_id": "uuid",          # FK para Destination
    "content_item_id": "uuid",         # FK para ContentItem selecionado
    "created_at": "datetime"
}
```

---

## 🔄 Fluxo de Trabalho

### Fluxo Completo (End-to-End)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CONFIGURAÇÃO INICIAL (Manual ou via API)                    │
│    - Criar Groups (nichos)                                      │
│    - Criar Sources (fontes de conteúdo)                         │
│    - Criar Destinations (canais de destino)                     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. FETCH (Descoberta de Conteúdo)                               │
│    n8n → POST /v1/n8n/process-all-groups                        │
│    │                                                             │
│    ├─ Background Task: process_n8n_fetch_job                    │
│    │  ├─ Para cada Group ativo:                                 │
│    │  │  ├─ Para cada Source ativa do grupo:                   │
│    │  │  │  ├─ FetcherService.fetch_from_source()              │
│    │  │  │  │  ├─ yt-dlp extrai metadados                       │
│    │  │  │  │  ├─ Verifica duplicação (platform + external_id) │
│    │  │  │  │  └─ Cria ContentItem com status="discovered"     │
│    │  │  │  └─ Salva no banco                                   │
│    │  │  └─ Próxima fonte                                       │
│    │  └─ Próximo grupo                                          │
│    │                                                             │
│    └─ Retorna: {job_id, status: "queued"}                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SELECT (Seleção de Conteúdo)                                 │
│    n8n → POST /v1/select                                        │
│    │  {                                                          │
│    │    "destination_id": "uuid",                                │
│    │    "idempotency_key": "uuid"                               │
│    │  }                                                          │
│    │                                                             │
│    ├─ SelectorService.select_content()                         │
│    │  ├─ Verifica idempotência (retorna mesmo item se existe)  │
│    │  ├─ Busca regras do destino                               │
│    │  ├─ Filtra ContentItems:                                   │
│    │  │  ├─ status = "discovered"                              │
│    │  │  ├─ Não reservado (reserved_until < now)                 │
│    │  │  ├─ Não publicado neste destino (PublishLog)            │
│    │  │  └─ Ordena por published_at DESC                        │
│    │  ├─ Reserva conteúdo (30 min)                              │
│    │  ├─ Salva IdempotencyKey                                   │
│    │  └─ Retorna ContentItem                                    │
│    │                                                             │
│    └─ Retorna: ContentItem ou {message: "No content available"} │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. DOWNLOAD (Download do Vídeo)                                 │
│    n8n → POST /v1/download                                      │
│    │  {                                                          │
│    │    "content_item_id": "uuid"                               │
│    │  }                                                          │
│    │                                                             │
│    ├─ Background Task: process_download_job                    │
│    │  ├─ DownloaderService.download_item()                     │
│    │  │  ├─ Busca Source e Group do ContentItem                │
│    │  │  ├─ Constrói URL do vídeo                               │
│    │  │  ├─ Define path: downloads/{grupo}/{fonte}/{video_id}.mp4│
│    │  │  ├─ yt-dlp baixa o vídeo                                │
│    │  │  ├─ Calcula hash SHA256 do arquivo                      │
│    │  │  ├─ Atualiza ContentItem:                               │
│    │  │  │  ├─ storage_path = "/app/downloads/..."             │
│    │  │  │  ├─ content_hash = "sha256..."                       │
│    │  │  │  └─ status = "downloaded"                            │
│    │  │  └─ Salva no banco                                     │
│    │  │                                                         │
│    │  └─ Retorna: {job_id, status: "queued"}                   │
│    │                                                             │
│    └─ n8n aguarda conclusão (polling ou webhook)                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. PUBLICAÇÃO (Fora do Orchestrator)                            │
│    n8n → Publica o vídeo na plataforma de destino               │
│    │  (YouTube API, Instagram API, etc.)                        │
│    │                                                             │
│    └─ Após sucesso, chama CONFIRM                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. CONFIRM (Confirmação de Publicação)                          │
│    n8n → POST /v1/confirm_publish                               │
│    │  {                                                          │
│    │    "destination_id": "uuid",                                │
│    │    "content_item_id": "uuid",                               │
│    │    "platform_post_id": "abc123",                           │
│    │    "result": "success"                                     │
│    │  }                                                          │
│    │                                                             │
│    ├─ Cria PublishLog                                            │
│    ├─ Atualiza ContentItem.status = "published"                │
│    ├─ Remove reserva (reserved_until = null)                    │
│    └─ Retorna: {message: "Published confirmed"}                 │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo Simplificado para n8n

```
┌─────────────────────────────────────────────────────────────┐
│ WORKFLOW N8N (Executado a cada X horas)                    │
│                                                             │
│ 1. Trigger: Cron (ex: a cada 6 horas)                      │
│                                                             │
│ 2. HTTP Request: POST /v1/n8n/process-all-groups            │
│    → Retorna: {job_id, status: "queued"}                   │
│                                                             │
│ 3. Loop: Para cada Destination ativo:                       │
│    │                                                         │
│    ├─ 3.1. HTTP Request: POST /v1/select                   │
│    │     {destination_id, idempotency_key}                  │
│    │     → Retorna: ContentItem ou "No content"             │
│    │                                                         │
│    ├─ 3.2. IF ContentItem existe:                           │
│    │     │                                                   │
│    │     ├─ HTTP Request: POST /v1/download                 │
│    │     │  {content_item_id}                               │
│    │     │  → Retorna: {job_id}                              │
│    │     │                                                   │
│    │     ├─ Aguardar job concluir (polling)                 │
│    │     │                                                   │
│    │     ├─ Ler arquivo de storage_path                     │
│    │     │                                                   │
│    │     ├─ Publicar na plataforma (YouTube/Instagram API)  │
│    │     │                                                   │
│    │     └─ HTTP Request: POST /v1/confirm_publish          │
│    │        {destination_id, content_item_id, result}        │
│    │                                                         │
│    └─ 3.3. ELSE: Pular para próximo destino                 │
│                                                             │
│ 4. Fim do workflow                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:8000/v1
```

### Endpoints de n8n

#### `POST /v1/n8n/process-all-groups`
Processa todos os grupos ativos, buscando conteúdo de todas as fontes.

**Request:**
```json
{}
```

**Response:**
```json
{
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
    "message": "Processamento de todos os grupos iniciado"
}
```

**Comportamento:**
- Cria um job do tipo `n8n_fetch_all`
- Executa em background: itera por todos os grupos ativos
- Para cada grupo, busca conteúdo de todas as fontes ativas
- Retorna imediatamente com `job_id` para rastreamento

#### `GET /v1/n8n/groups-summary`
Retorna resumo de todos os grupos, fontes e destinos.

**Response:**
```json
{
    "total_groups": 2,
    "groups": [
        {
            "group_id": "uuid",
            "group_name": "Culinária",
            "description": "Receitas e dicas",
            "sources_count": 3,
            "sources": [
                {
                    "id": "uuid",
                    "platform": "youtube",
                    "external_id": "@ShortsPodcuts"
                }
            ],
            "destinations_count": 2,
            "destinations": [
                {
                    "id": "uuid",
                    "platform": "youtube",
                    "account_id": "@MeuCanal"
                }
            ]
        }
    ]
}
```

**Nota:** Groups, Sources e Destinations são gerenciados via Google Sheets no n8n, não via API.

### Endpoints de Fetch

#### `POST /v1/fetch/run`
Inicia busca de conteúdo de todas as fontes ativas (alternativa ao endpoint n8n).

**Response:**
```json
{
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued"
}
```

### Endpoints de Seleção

#### `POST /v1/select`
Seleciona o melhor conteúdo disponível para um destino.

**Request:**
```json
{
    "destination_id": "550e8400-e29b-41d4-a716-446655440000",
    "idempotency_key": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response (Sucesso):**
```json
{
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "platform": "youtube",
    "external_video_id": "dQw4w9WgXcQ",
    "source_id": "880e8400-e29b-41d4-a716-446655440003",
    "published_at": "2024-01-15T10:30:00Z",
    "status": "discovered",
    "reserved_until": "2024-01-15T11:00:00Z",
    "reserved_by_destination_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-15T10:00:00Z"
}
```

**Response (Sem conteúdo):**
```json
{
    "message": "No content available"
}
```

**Lógica de Seleção:**
1. Verifica idempotência: se `idempotency_key` já existe, retorna o mesmo conteúdo
2. Filtra ContentItems:
   - `status = "discovered"`
   - `reserved_until < now` (não reservado)
   - Não publicado neste destino (verifica PublishLog)
   - `reserved_by_destination_id = null` ou igual ao destino atual
3. Ordena por `published_at DESC` (mais recente primeiro)
4. Reserva o conteúdo por 30 minutos
5. Salva IdempotencyKey

### Endpoints de Download

#### `POST /v1/download`
Inicia download de um conteúdo.

**Request:**
```json
{
    "content_item_id": "770e8400-e29b-41d4-a716-446655440002"
}
```

**Response:**
```json
{
    "job_id": "990e8400-e29b-41d4-a716-446655440004",
    "status": "queued"
}
```

**Comportamento:**
- Cria job do tipo `download`
- Executa em background
- Baixa vídeo usando yt-dlp
- Organiza em `downloads/{grupo}/{fonte}/{video_id}.mp4`
- Calcula hash SHA256
- Atualiza `ContentItem` com `storage_path`, `content_hash` e `status = "downloaded"`

### Endpoints de Confirmação

#### `POST /v1/confirm_publish`
Confirma que um conteúdo foi publicado.

**Request:**
```json
{
    "destination_id": "550e8400-e29b-41d4-a716-446655440000",
    "content_item_id": "770e8400-e29b-41d4-a716-446655440002",
    "platform_post_id": "abc123xyz",
    "result": "success"
}
```

**Response:**
```json
{
    "message": "Published confirmed"
}
```

**Comportamento:**
- Cria `PublishLog`
- Atualiza `ContentItem.status = "published"`
- Remove reserva (`reserved_until = null`, `reserved_by_destination_id = null`)

### Endpoints de Health

#### `GET /health`
Verifica saúde da API.

**Response:**
```json
{
    "status": "healthy",
    "database": "connected"
}
```

---

## 🤖 Integração com n8n

### Workflow Principal (Processamento Automatizado)

O n8n deve executar este workflow periodicamente (ex: a cada 6 horas):

```javascript
// 1. TRIGGER: Cron Schedule
// Configuração: "0 */6 * * *" (a cada 6 horas)

// 2. HTTP Request: Processar Todos os Grupos
POST http://orchestrator.postagensapp.shop/v1/n8n/process-all-groups
Headers: {}
Body: {}

// 3. Aguardar 5 minutos (para fetch concluir)

// 4. HTTP Request: Obter Resumo dos Grupos
GET http://orchestrator.postagensapp.shop/v1/n8n/groups-summary

// 5. Loop: Para cada Destination ativo
//    (usar "Split In Batches" ou "Loop Over Items")

// 5.1. Gerar Idempotency Key
//      UUID aleatório ou baseado em timestamp + destination_id

// 5.2. HTTP Request: Selecionar Conteúdo
POST http://orchestrator.postagensapp.shop/v1/select
Headers: {
    "Content-Type": "application/json"
}
Body: {
    "destination_id": "{{$json.destination_id}}",
    "idempotency_key": "{{$json.idempotency_key}}"
}

// 5.3. IF: ContentItem retornado (não "No content available")
//     THEN:
//         5.3.1. HTTP Request: Iniciar Download
//                POST http://orchestrator.postagensapp.shop/v1/download
//                Body: {
//                    "content_item_id": "{{$json.id}}"
//                }
//
//         5.3.2. Aguardar Job Concluir (Polling)
//                Loop:
//                  - Aguardar 10 segundos
//                  - GET /v1/jobs/{job_id}
//                  - IF status = "completed": CONTINUE
//                  - IF status = "failed": BREAK
//
//         5.3.3. Buscar ContentItem Atualizado
//                GET /v1/content-items/{{content_item_id}}
//                → Obter storage_path
//
//         5.3.4. Ler Arquivo do Storage
//                (Acesso direto ao filesystem ou via API de storage)
//
//         5.3.5. Publicar na Plataforma
//                (YouTube API, Instagram API, etc.)
//                → Obter platform_post_id
//
//         5.3.6. HTTP Request: Confirmar Publicação
//                POST http://orchestrator.postagensapp.shop/v1/confirm_publish
//                Body: {
//                    "destination_id": "{{destination_id}}",
//                    "content_item_id": "{{content_item_id}}",
//                    "platform_post_id": "{{platform_post_id}}",
//                    "result": "success"
//                }
//
//     ELSE:
//         Log: "No content available for destination"
//         CONTINUE para próximo destino

// 6. Fim do Loop

// 7. Notificação (Opcional)
//    Enviar email/webhook com resumo do processamento
```

### Workflow de Monitoramento

Workflow separado para monitorar saúde e estatísticas:

```javascript
// 1. TRIGGER: Cron (a cada hora)

// 2. HTTP Request: Health Check
GET http://orchestrator.postagensapp.shop/health

// 3. HTTP Request: Groups Summary
GET http://orchestrator.postagensapp.shop/v1/n8n/groups-summary

// 4. Verificar métricas:
//    - Total de grupos ativos
//    - Total de fontes ativas
//    - Total de destinos ativos
//    - Últimos jobs (status, erros)

// 5. IF: Algum problema detectado
//    THEN: Enviar alerta (email, Telegram, etc.)
```

### Exemplo de Configuração n8n

#### Credenciais HTTP
- **Name**: Content Orchestrator API
- **Base URL**: `https://orchestrator.postagensapp.shop`
- **Headers**: `Content-Type: application/json`

#### Variáveis de Ambiente n8n
```env
ORCHESTRATOR_API_URL=https://orchestrator.postagensapp.shop
ORCHESTRATOR_API_KEY= (se implementar autenticação)
```

---

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

Crie um arquivo `.env` na raiz do projeto:

```env
# Supabase / Database
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-supabase
DATABASE_URL=postgresql+asyncpg://postgres:senha@db.seu-projeto.supabase.co:5432/postgres

# Storage
STORAGE_TYPE=local                    # local | supabase
LOCAL_STORAGE_PATH=/app/downloads      # Caminho para armazenamento local

# API
PROJECT_NAME=Content Orchestrator
API_V1_STR=/v1

# Traefik (para deploy)
DOMAIN_NAME=postagensapp.shop
ORCHESTRATOR_SUBDOMAIN=orchestrator
SSL_EMAIL=seu-email@exemplo.com
```

### Instalação de Dependências

   ```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependências
   pip install -r requirements.txt
   ```

### Inicialização do Banco de Dados

O banco é inicializado automaticamente na primeira execução via `init_db()` em `app/main.py`. As tabelas são criadas automaticamente usando SQLModel.

**Nota:** Certifique-se de que o Supabase está acessível e as credenciais estão corretas.

---

## 🚀 Deploy

### Deploy com Docker

#### 1. Build da Imagem

```bash
docker build -t content-orchestrator .
```

#### 2. Docker Compose

O projeto inclui um `docker-compose.yml` para facilitar o deploy:

```yaml
version: '3.8'

services:
  content-orchestrator:
    build: .
    container_name: content-orchestrator
    restart: always
    env_file: .env
    environment:
      - STORAGE_TYPE=local
      - LOCAL_STORAGE_PATH=/app/downloads
    volumes:
      - ./downloads:/app/downloads
      - ./logs:/app/logs
      - ./data:/app/data
    ports:
      - "127.0.0.1:8002:8000"
    labels:
      - traefik.enable=true
      - traefik.http.routers.content-orchestrator.rule=Host(`orchestrator.${DOMAIN_NAME}`)
      - traefik.http.routers.content-orchestrator.entrypoints=web,websecure
      - traefik.http.routers.content-orchestrator.tls=true
      - traefik.http.routers.content-orchestrator.tls.certresolver=mytlschallenge
      - traefik.http.services.content-orchestrator.loadbalancer.server.port=8000
    command: "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
```

#### 3. Executar

```bash
# Criar arquivo .env
cp .env.example .env
# Editar .env com suas credenciais

# Iniciar container
docker compose up -d

# Ver logs
docker logs -f content-orchestrator

# Parar
docker compose down
```

### Deploy em VPS com Traefik

Se você já tem Traefik rodando na VPS:

1. Adicione o serviço ao seu `docker-compose.yml` existente
2. Configure as labels do Traefik (já incluídas no exemplo)
3. Certifique-se de que o domínio `orchestrator.seu-dominio.com` aponta para o IP da VPS
4. O Traefik gerencia SSL automaticamente via Let's Encrypt

### Verificação Pós-Deploy

```bash
# Health check
curl http://localhost:8002/health

# Documentação
curl http://localhost:8002/docs

# Testar endpoint n8n
curl -X POST http://localhost:8002/v1/n8n/process-all-groups
```

---

## 📁 Estrutura do Projeto

### Arquivos de Produção (Essenciais)

```
content-orchestrator/
├── app/                        # Código da aplicação (ESSENCIAL)
│   ├── __init__.py
│   ├── main.py                 # Aplicação FastAPI principal
│   │
│   ├── api/                   # Camada de API
│   │   ├── __init__.py
│   │   ├── dependencies.py    # Dependências (get_db_session)
│   │   └── routes/            # Rotas da API
│   │       ├── __init__.py
│   │       ├── n8n.py          # Endpoints específicos para n8n
│   │       ├── fetch.py        # Endpoint de fetch
│   │       ├── select.py       # Endpoint de seleção
│   │       ├── download.py     # Endpoint de download
│   │       ├── confirm.py      # Endpoint de confirmação
│   │       └── health.py       # Health check
│   │
│   ├── core/                   # Configurações centrais
│   │   ├── __init__.py
│   │   ├── config.py           # Configurações (Settings)
│   │   ├── database.py         # Conexão com banco
│   │   └── logging.py          # Configuração de logs
│   │
│   ├── models/                 # Modelos de dados (SQLModel)
│   │   ├── __init__.py
│   │   ├── group.py            # Modelo Group
│   │   ├── source.py           # Modelo Source
│   │   ├── destination.py       # Modelo Destination
│   │   ├── content_item.py     # Modelo ContentItem
│   │   ├── job.py              # Modelo Job
│   │   ├── publish_log.py      # Modelo PublishLog
│   │   ├── rule.py             # Modelo Rule (regras de seleção)
│   │   └── idempotency_key.py  # Modelo IdempotencyKey
│   │
│   └── services/              # Lógica de negócio
│       ├── __init__.py
│       ├── fetcher/
│       │   └── service.py     # FetcherService (busca conteúdo)
│       └── downloader/
│           └── service.py     # DownloaderService (download usando yt-dlp)
│
├── data/                      # Cookies e dados auxiliares (opcional)
├── downloads/                  # Vídeos baixados (organizados por grupo/fonte)
│
├── .env                        # Variáveis de ambiente (não versionado)
├── .env.example                # Exemplo de .env
├── Dockerfile                  # Imagem Docker (ESSENCIAL)
├── docker-compose.yml          # Orquestração Docker (ESSENCIAL)
├── requirements.txt            # Dependências Python (ESSENCIAL)
├── cookies.txt                 # Cookies para autenticação (opcional, pode ser gerado)
└── README.md                   # Documentação principal
```

### 📁 Diretórios e Arquivos Opcionais

#### 📁 Diretórios (podem ser criados automaticamente)
- `data/` - Usado para armazenar `cookies.txt` (opcional, apenas se usar autenticação com cookies)

#### 📦 Arquivos Gerados Automaticamente (não devem estar no repositório)
- `__pycache__/` - Cache do Python (deve estar no `.gitignore`)
- Arquivos `.pyc` - Bytecode compilado (deve estar no `.gitignore`)

### ✅ Arquivos Essenciais para Produção

**Para produção, você precisa APENAS de:**
- ✅ Diretório `app/` completo (código da aplicação)
- ✅ `Dockerfile` (containerização)
- ✅ `docker-compose.yml` (orquestração)
- ✅ `requirements.txt` (dependências)
- ✅ `.env` (configurações - não versionado)
- ✅ `README.md` (documentação principal)

**Opcional:**
- `cookies.txt` - Necessário apenas se usar autenticação com cookies (pode ser gerado/fornecido separadamente)

---

### Organização de Downloads

Os vídeos são organizados automaticamente por grupo e fonte:

```
downloads/
├── culinaria/                 # Nome do grupo (sanitizado)
│   ├── shortspodcuts/         # external_id da fonte (sanitizado)
│   │   ├── dQw4w9WgXcQ.mp4
│   │   └── abc123xyz.mp4
│   └── receitasfacil/
│       └── def456uvw.mp4
│
└── financas/
    └── investimentos/
        └── ghi789rst.mp4
```

**Sanitização:**
- Nomes de grupos e fontes são convertidos para lowercase
- Espaços são substituídos por `_`
- Caracteres especiais são removidos ou substituídos

---

## 💡 Exemplos de Uso

**Nota:** Configuração de Groups, Sources e Destinations é feita via Google Sheets no n8n, não via API.

### 1. Processamento Automático (n8n)

```bash
# Processar todos os grupos
curl -X POST http://localhost:8000/v1/n8n/process-all-groups

# Resposta:
# {
#   "job_id": "550e8400-e29b-41d4-a716-446655440000",
#   "status": "queued",
#   "message": "Processamento de todos os grupos iniciado"
# }
```

### 3. Seleção Manual de Conteúdo

```bash
# Selecionar conteúdo para um destino
curl -X POST http://localhost:8000/v1/select \
  -H "Content-Type: application/json" \
  -d '{
    "destination_id": "550e8400-e29b-41d4-a716-446655440000",
    "idempotency_key": "660e8400-e29b-41d4-a716-446655440001"
  }'
```

### 4. Download Manual

```bash
# Iniciar download
curl -X POST http://localhost:8000/v1/download \
  -H "Content-Type: application/json" \
  -d '{
    "content_item_id": "770e8400-e29b-41d4-a716-446655440002"
  }'

# Verificar status do job
curl http://localhost:8000/v1/jobs/{job_id}
```

---

## 🔒 Segurança e Boas Práticas

### Autenticação

**Nota:** Atualmente o sistema não implementa autenticação. Para produção, recomenda-se:

1. **API Keys**: Adicionar middleware de autenticação via header `X-API-Key`
2. **JWT Tokens**: Implementar autenticação JWT para n8n
3. **Rate Limiting**: Limitar requisições por IP/API key

### Validação de Dados

- Todos os endpoints usam Pydantic para validação automática
- UUIDs são validados automaticamente
- Datas são parseadas e validadas

### Tratamento de Erros

- Erros são logados com detalhes completos
- Jobs falhados mantêm `error_message` para debugging
- Status HTTP apropriados são retornados (400, 404, 500)

### Backup e Recuperação

- Banco de dados: Use backups automáticos do Supabase
- Arquivos: Faça backup periódico do diretório `downloads/`
- Logs: Mantenha logs rotacionados (ex: 30 dias)

---

## 🐛 Troubleshooting

### Problema: Erro de conexão com banco

**Sintoma:** `asyncpg.exceptions.InvalidPasswordError`

**Solução:**
1. Verifique `DATABASE_URL` no `.env`
2. Certifique-se de que a senha está URL-encoded (ex: `@` vira `%40`)
3. Verifique se o Supabase permite conexões do seu IP

### Problema: Download falha

**Sintoma:** Job de download com `status = "failed"`

**Solução:**
1. Verifique logs: `docker logs content-orchestrator`
2. Verifique se `ffmpeg` está instalado no container
3. Verifique espaço em disco: `df -h`
4. Verifique permissões do diretório `downloads/`

### Problema: Conteúdo duplicado

**Sintoma:** Mesmo vídeo aparece múltiplas vezes

**Solução:**
1. Verifique se `external_video_id` é único por plataforma
2. Verifique constraint `unique_content_item` no banco
3. Limpe duplicatas manualmente se necessário

### Problema: n8n não encontra conteúdo

**Sintoma:** `/v1/select` sempre retorna "No content available"

**Solução:**
1. Verifique se o fetch foi executado: `GET /v1/n8n/groups-summary`
2. Verifique se há ContentItems com `status = "discovered"`
3. Verifique se os destinos estão no mesmo grupo das fontes
4. Verifique se há conteúdo já publicado (PublishLog)

---

## 📚 Recursos Adicionais

### Documentação da API

Acesse a documentação interativa:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Logs

Os logs são salvos em:
- **Console**: Saída padrão do container
- **Arquivo**: `logs/app.log` (se configurado)

### Monitoramento

Recomenda-se monitorar:
- Status dos jobs (`/v1/jobs`)
- Health da API (`/health`)
- Espaço em disco (`downloads/`)
- Uso de memória/CPU do container

---

## 🤝 Contribuindo

Este é um projeto privado, mas sugestões são bem-vindas:

1. Reporte bugs via issues
2. Sugira melhorias
3. Documente casos de uso adicionais

---

## 📄 Licença

Proprietário - Todos os direitos reservados.

---

## 📞 Suporte

Para suporte técnico:
- Verifique a documentação da API em `/docs`
- Consulte os logs do container
- Revise este README para troubleshooting

---

**Desenvolvido com ❤️ usando FastAPI, Supabase e n8n**
