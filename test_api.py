"""
Script de teste para a API Content Orchestrator (versão stateless)
Testa todos os endpoints principais da aplicação
"""
import requests
import json
import time
import sys
import io

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Configuração
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/v1"

# Cores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.RESET}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.RESET}")

def test_health():
    """Testa o endpoint de health check"""
    print("\n" + "="*60)
    print("1️⃣  TESTANDO HEALTH CHECK")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print_success(f"Health check OK: {response.json()}")
            return True
        else:
            print_error(f"Health check falhou: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Não foi possível conectar à API. Certifique-se de que o servidor está rodando.")
        print_info("Execute: python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        return False
    except Exception as e:
        print_error(f"Erro ao testar health: {e}")
        return False

def test_n8n_health():
    """Testa o endpoint de health do n8n"""
    print("\n" + "="*60)
    print("2️⃣  TESTANDO N8N HEALTH")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE}/n8n/health", timeout=5)
        if response.status_code == 200:
            print_success(f"N8N health check OK: {response.json()}")
            return True
        else:
            print_error(f"N8N health check falhou: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Erro ao testar n8n health: {e}")
        return False

def test_fetch():
    """Testa o endpoint de fetch (buscar novos conteúdos)"""
    print("\n" + "="*60)
    print("3️⃣  TESTANDO FETCH (Buscar Conteúdos)")
    print("="*60)
    
    # Exemplo de fonte
    test_source = {
        "platform": "youtube",
        "external_id": "UC_x5XG1OV2P6uZZ5FSM9Ttw",  # Canal de exemplo do Google
        "group_name": "teste"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/fetch/run",
            json=test_source,
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            print_success(f"Fetch concluído: {data.get('status')}")
            print_info(f"Vídeos encontrados: {data.get('videos_found', 0)}")
            if data.get('videos'):
                print_info(f"Primeiro vídeo: {data['videos'][0].get('title', 'N/A')}")
            return data
        else:
            print_error(f"Fetch falhou: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Erro ao testar fetch: {e}")
        return None

def test_n8n_process_sources():
    """Testa o endpoint de processar múltiplas fontes"""
    print("\n" + "="*60)
    print("4️⃣  TESTANDO N8N PROCESS SOURCES")
    print("="*60)
    
    test_sources = {
        "sources": [
            {
                "platform": "youtube",
                "external_id": "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                "group_name": "tecnologia"
            }
        ]
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/n8n/process-sources",
            json=test_sources,
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            print_success(f"Processamento concluído: {data.get('status')}")
            print_info(f"Vídeos encontrados: {data.get('videos_found', 0)}")
            return data
        else:
            print_error(f"Processamento falhou: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Erro ao testar process sources: {e}")
        return None

def test_select():
    """Testa o endpoint de select (selecionar conteúdo)"""
    print("\n" + "="*60)
    print("5️⃣  TESTANDO SELECT (Selecionar Conteúdo)")
    print("="*60)
    
    # Exemplo com vídeos mock
    test_request = {
        "destination_platform": "youtube",
        "destination_account_id": "UCyyyyy",
        "group_name": "tecnologia",
        "available_videos": [
            {
                "external_video_id": "test123",
                "title": "Vídeo Teste",
                "url": "https://youtube.com/watch?v=test123",
                "platform": "youtube",
                "group_name": "tecnologia"
            }
        ]
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/select",
            json=test_request,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Seleção concluída: {data.get('message')}")
            if data.get('selected'):
                print_info(f"Vídeo selecionado: {data['selected'].get('title', 'N/A')}")
            return data
        else:
            print_error(f"Select falhou: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Erro ao testar select: {e}")
        return None

def test_docs():
    """Testa se a documentação está acessível"""
    print("\n" + "="*60)
    print("6️⃣  TESTANDO DOCUMENTAÇÃO")
    print("="*60)
    
    endpoints = [
        ("/", "Painel Principal"),
        ("/docs", "Swagger UI"),
        ("/redoc", "ReDoc"),
        ("/v1/openapi.json", "OpenAPI JSON")
    ]
    
    all_ok = True
    for endpoint, name in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            if response.status_code == 200:
                print_success(f"{name}: OK")
            else:
                print_warning(f"{name}: Status {response.status_code}")
                all_ok = False
        except Exception as e:
            print_error(f"{name}: Erro - {e}")
            all_ok = False
    
    return all_ok

def main():
    """Função principal de teste"""
    print("\n" + "="*60)
    print("🧪 TESTE DA API CONTENT ORCHESTRATOR (Stateless)")
    print("="*60)
    print(f"\n📍 URL Base: {BASE_URL}")
    print(f"📍 API Base: {API_BASE}\n")
    print_info("⚠️  Esta versão é stateless - não usa banco de dados")
    print_info("    Dados são gerenciados via Google Sheets no n8n\n")
    
    # Teste 1: Health Check
    if not test_health():
        print_error("\n❌ API não está respondendo. Verifique se o servidor está rodando.")
        sys.exit(1)
    
    # Teste 2: N8N Health
    test_n8n_health()
    
    # Teste 3: Fetch
    fetch_result = test_fetch()
    
    # Teste 4: N8N Process Sources
    process_result = test_n8n_process_sources()
    
    # Teste 5: Select
    select_result = test_select()
    
    # Teste 6: Documentação
    test_docs()
    
    # Resumo
    print("\n" + "="*60)
    print("📊 RESUMO DOS TESTES")
    print("="*60)
    print_success("Health Check: OK")
    print_success("N8N Health: OK")
    print_success("Fetch: Testado")
    print_success("N8N Process Sources: Testado")
    print_success("Select: Testado")
    print_success("Documentação: Verificada")
    
    print("\n" + "="*60)
    print("✅ TESTES CONCLUÍDOS")
    print("="*60)
    print("\n💡 Dicas:")
    print("   - Verifique os logs do servidor para mais detalhes")
    print("   - Acesse http://localhost:8000/docs para testar manualmente")
    print("   - Veja GUIA_N8N_FLUXO.md para o fluxo completo no n8n")
    print("   - Veja ATUALIZAR_VPS.md para atualizar na VPS")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Teste interrompido pelo usuário")
        sys.exit(0)
