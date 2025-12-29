# 🚀 Guia Completo: Fluxo no n8n com Google Sheets

## 📊 Estrutura do Google Sheets

Crie um Google Sheets com as seguintes abas:

### 1. **Fontes** (Sources)
| platform | external_id | group_name | status | ultima_busca |
|----------|-------------|------------|--------|--------------|
| youtube | UCxxxxx | tecnologia | active | 2024-01-15 |
| instagram | @perfil | tecnologia | active | 2024-01-15 |
| tiktok | @usuario | entretenimento | active | 2024-01-14 |

### 2. **Vídeos Encontrados** (Videos)
| video_id | platform | external_id | title | url | duration | view_count | group_name | status | data_encontrado |
|----------|----------|-------------|-------|-----|----------|------------|------------|--------|-----------------|
| abc123 | youtube | UCxxxxx | Vídeo 1 | https://... | 300 | 1000 | tecnologia | discovered | 2024-01-15 |
| def456 | instagram | @perfil | Vídeo 2 | https://... | 60 | 500 | tecnologia | downloaded | 2024-01-15 |

**Status possíveis:**
- `discovered` - Vídeo encontrado, ainda não baixado
- `downloaded` - Vídeo baixado, pronto para publicação
- `published` - Vídeo já publicado
- `error` - Erro no processamento

### 3. **Destinos** (Destinations)
| platform | account_id | group_name | daily_limit | status |
|----------|------------|------------|-------------|--------|
| youtube | UCyyyyy | tecnologia | 3 | active |
| instagram | @canal | tecnologia | 5 | active |
| tiktok | @conta | entretenimento | 10 | active |

### 4. **Histórico de Publicações** (PublishLog)
| video_id | destination_platform | destination_account | result | platform_post_id | error_message | published_at |
|----------|----------------------|---------------------|--------|------------------|---------------|--------------|
| abc123 | youtube | UCyyyyy | success | yt_12345 | - | 2024-01-15 10:00 |
| def456 | instagram | @canal | error | - | Rate limit | 2024-01-15 11:00 |

---

## 🔄 Workflow 1: Buscar Novos Vídeos (Fetch)

**Trigger:** Cron (a cada X horas) ou Manual

### Passos:

1. **Google Sheets - Ler Fontes Ativas**
   - Ação: `Read from Sheet`
   - Filtro: `status = "active"`
   - Resultado: Lista de fontes

2. **Transformar Dados**
   - Node: `Code` ou `Set`
   - Formatar para o formato da API:
   ```json
   {
     "sources": [
       {
         "platform": "youtube",
         "external_id": "UCxxxxx",
         "group_name": "tecnologia"
       }
     ]
   }
   ```

3. **Chamar API - Processar Fontes**
   - Node: `HTTP Request`
   - Método: `POST`
   - URL: `http://seu-servidor:8000/v1/n8n/process-sources`
   - Body: JSON formatado acima
   - Resultado: Lista de vídeos encontrados

4. **Processar Resposta**
   - Node: `Code` ou `Split`
   - Extrair array `videos` da resposta
   - Para cada vídeo, verificar se já existe no Google Sheets

5. **Google Sheets - Adicionar Novos Vídeos**
   - Node: `Google Sheets - Append`
   - Apenas vídeos que não existem (filtrar por `video_id`)
   - Status inicial: `discovered`

**Resultado:** Novos vídeos adicionados na aba "Vídeos Encontrados" com status `discovered`

---

## 📥 Workflow 2: Baixar Vídeos

**Trigger:** Cron (a cada X minutos) ou Manual

### Passos:

1. **Google Sheets - Ler Vídeos para Download**
   - Ação: `Read from Sheet`
   - Filtro: `status = "discovered"`
   - Limite: 10 vídeos por vez (evitar sobrecarga)

2. **Para cada vídeo:**
   
   a. **Chamar API - Download**
      - Node: `HTTP Request`
      - Método: `POST`
      - URL: `http://seu-servidor:8000/v1/download`
      - Body:
      ```json
      {
        "video_url": "{{$json.url}}",
        "platform": "{{$json.platform}}",
        "external_video_id": "{{$json.external_video_id}}",
        "group_name": "{{$json.group_name}}",
        "source_name": "{{$json.external_id}}"
      }
      ```
   
   b. **Aguardar Download** (opcional)
      - Node: `Wait` (5-10 minutos dependendo do tamanho)
      - Ou verificar arquivo no servidor
   
   c. **Google Sheets - Atualizar Status**
      - Node: `Google Sheets - Update`
      - Atualizar linha do vídeo
      - Mudar `status` para `downloaded`
      - Adicionar `data_download` com timestamp

**Resultado:** Vídeos baixados e status atualizado para `downloaded`

---

## 🎯 Workflow 3: Selecionar e Publicar

**Trigger:** Cron (a cada hora) ou Manual

### Passos:

1. **Google Sheets - Ler Destinos Ativos**
   - Ação: `Read from Sheet`
   - Filtro: `status = "active"`
   - Resultado: Lista de destinos

2. **Para cada destino:**
   
   a. **Google Sheets - Ler Vídeos Disponíveis**
      - Ação: `Read from Sheet`
      - Filtro: 
        - `status = "downloaded"`
        - `group_name = {{destino.group_name}}`
        - Não publicado para este destino (verificar histórico)
      - Limite: `daily_limit` do destino
   
   b. **Chamar API - Selecionar Vídeo**
      - Node: `HTTP Request`
      - Método: `POST`
      - URL: `http://seu-servidor:8000/v1/select`
      - Body:
      ```json
      {
        "destination_platform": "{{destino.platform}}",
        "destination_account_id": "{{destino.account_id}}",
        "group_name": "{{destino.group_name}}",
        "available_videos": [/* array de vídeos do passo anterior */]
      }
      ```
   
   c. **Publicar Vídeo** (lógica no n8n)
      - Node: `YouTube`, `Instagram`, `TikTok` (conforme plataforma)
      - Ou usar API específica da plataforma
      - Upload do arquivo baixado
      - Resultado: `platform_post_id` ou erro
   
   d. **Chamar API - Confirmar Publicação**
      - Node: `HTTP Request`
      - Método: `POST`
      - URL: `http://seu-servidor:8000/v1/confirm_publish`
      - Body:
      ```json
      {
        "video_id": "{{video.external_video_id}}",
        "destination_platform": "{{destino.platform}}",
        "destination_account_id": "{{destino.account_id}}",
        "result": "success", // ou "error"
        "platform_post_id": "{{post_id}}",
        "error_message": null // ou mensagem de erro
      }
      ```
   
   e. **Google Sheets - Atualizar Status do Vídeo**
      - Node: `Google Sheets - Update`
      - Atualizar vídeo: `status = "published"`
   
   f. **Google Sheets - Adicionar ao Histórico**
      - Node: `Google Sheets - Append`
      - Adicionar linha na aba "PublishLog"
      - Registrar sucesso ou erro

**Resultado:** Vídeos publicados e histórico registrado

---

## 🔍 Workflow 4: Verificar Downloads Concluídos (Opcional)

**Trigger:** Cron (a cada 5 minutos)

### Passos:

1. **Verificar Arquivos no Servidor**
   - Node: `SSH` ou `HTTP Request` (se tiver endpoint de verificação)
   - Listar arquivos em `downloads/{grupo}/{fonte}/`
   - Comparar com vídeos com status `discovered` no Google Sheets

2. **Google Sheets - Atualizar Status**
   - Para vídeos com arquivo encontrado: `status = "downloaded"`

---

## 📋 Resumo dos Endpoints da API

### 1. Buscar Vídeos
```
POST /v1/n8n/process-sources
Body: {
  "sources": [
    {"platform": "youtube", "external_id": "UCxxxxx", "group_name": "tecnologia"}
  ]
}
Response: {
  "status": "completed",
  "videos_found": 5,
  "videos": [...]
}
```

### 2. Download
```
POST /v1/download
Body: {
  "video_url": "https://...",
  "platform": "youtube",
  "external_video_id": "abc123",
  "group_name": "tecnologia",
  "source_name": "UCxxxxx"
}
Response: {
  "status": "queued",
  "message": "Download iniciado..."
}
```

### 3. Selecionar
```
POST /v1/select
Body: {
  "destination_platform": "youtube",
  "destination_account_id": "UCyyyyy",
  "group_name": "tecnologia",
  "available_videos": [...]
}
Response: {
  "message": "Content selected",
  "selected": {...}
}
```

### 4. Confirmar Publicação
```
POST /v1/confirm_publish
Body: {
  "video_id": "abc123",
  "destination_platform": "youtube",
  "destination_account_id": "UCyyyyy",
  "result": "success",
  "platform_post_id": "yt_12345"
}
Response: {
  "status": "confirmed",
  "message": "..."
}
```

### 5. Health Check
```
GET /v1/n8n/health
Response: {
  "status": "ok",
  "message": "n8n integration ready"
}
```

---

## 🎯 Dicas Importantes

1. **Deduplicação:** No n8n, antes de adicionar vídeo ao Google Sheets, verifique se `external_video_id` já existe

2. **Rate Limits:** Respeite limites das plataformas (YouTube, Instagram, TikTok). Use delays entre requisições

3. **Erros:** Sempre trate erros e atualize status no Google Sheets para `error` com mensagem

4. **Logs:** Use nodes de `Log` no n8n para debug

5. **Agendamento:** Configure cron jobs adequados:
   - Fetch: 1x por dia (manhã)
   - Download: A cada 30 minutos
   - Publicação: A cada hora (respeitando `daily_limit`)

6. **Backup:** Faça backup periódico do Google Sheets

---

## 🚀 Exemplo de Workflow Completo (n8n)

```
┌─────────────────┐
│  Cron Trigger   │ (Diário às 8h)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Google Sheets   │ (Ler Fontes)
│ Read            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Code/Set        │ (Formatar JSON)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ HTTP Request    │ (POST /v1/n8n/process-sources)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Split          │ (Separar vídeos)
└───────┬───────┘
        │
        ▼
┌─────────────────┐
│ Google Sheets   │ (Verificar se existe)
│ Read            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ IF              │ (Se não existe)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Google Sheets   │ (Adicionar vídeo)
│ Append          │
└─────────────────┘
```

---

## 📝 Próximos Passos

1. Criar Google Sheets com as 4 abas
2. Configurar credenciais do Google Sheets no n8n
3. Criar workflow de Fetch
4. Testar com 1-2 fontes
5. Criar workflow de Download
6. Criar workflow de Publicação
7. Configurar agendamentos (Cron)

**Pronto!** Agora você tem um sistema completo gerenciado via n8n e Google Sheets! 🎉

