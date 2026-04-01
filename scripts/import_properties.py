import csv
import json
import re
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime

# Configurações do Supabase (lidas do seu .env)
SUPABASE_URL = "https://fcheeslldnywydwrzdqx.supabase.co"
SUPABASE_KEY = "sb_publishable_-eLmo6kNFDSdASzFjqR7BA_JrZic7-E" 

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def clean_currency(value):
    if not value or value == "-" or value == "#REF!":
        return 0
    # Remove R$, espaços, e troca vírgula decimal por ponto
    clean = re.sub(r'[R\$\s\.]', '', str(value)).replace(',', '.')
    try:
        return float(clean)
    except:
        return 0

def clean_area(value):
    if not value or value == "-":
        return 0
    # Remove m², espaços, etc.
    clean = re.sub(r'[m²\s\.]', '', str(value)).replace(',', '.')
    try:
        return float(clean)
    except:
        return 0

def map_stage(excel_stage):
    mapping = {
        "1. ITBI/Contrato/Registro": "itbi_contrato",
        "Pre-Arrematacao": "pre_arrematacao",
        "Desocupação": "desocupacao",
        "Reforma": "reforma",
        "Venda": "venda",
        "Finalizado": "finalizado"
    }
    # Busca por aproximação
    for key, val in mapping.items():
        if key.lower() in str(excel_stage).lower():
            return val
    return "itbi_contrato" # Default

def map_property_type(excel_type):
    t = str(excel_type).lower()
    if "casa" in t: return "casa"
    if "apartamento" in t or "ap" in t: return "apartamento"
    if "terreno" in t: return "terreno"
    if "comercial" in t: return "comercial"
    return "casa"

def map_occupation(excel_occ):
    o = str(excel_occ).lower()
    if "desocupado" in o: return "desocupado"
    if "venda para ocupante" in o: return "venda_para_ocupante"
    if "imissão" in o: return "imissao_na_posse"
    if "ocupado" in o: return "ocupado"
    return "ocupado"

def supabase_request(url, method="POST", data=None):
    req = urllib.request.Request(url, headers=HEADERS, method=method)
    if data:
        json_data = json.dumps(data).encode("utf-8")
        req.data = json_data
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body) if res_body else []
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        # Swallow 409 (Conflict/Duplicate) as we handle it by fetching
        if e.code != 409:
            print(f"❌ Erro na requisição ({e.code}): {error_body}")
        return None
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return None

def import_data(file_path):
    print(f"🚀 Iniciando importação do arquivo: {file_path}")
    
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        # Detecta se é tabulado ou vírgula
        sample = f.read(4096)
        f.seek(0)
        dialect = csv.Sniffer().sniff(sample)
        reader = csv.DictReader(f, dialect=dialect)
        
        for row in reader:
            code = row.get("CODIGO DO IMOVEL", "").strip()
            if not code or code == "0": continue
            
            print(f"📦 Processando Imóvel: {code}")
            
            # 1. Garantir que a Cidade exista
            city_name = row.get("CIDADE", "").strip()
            state_sigla = row.get("UF", "").strip()
            
            city_id = None
            if city_name and state_sigla:
                city_payload = {"city": city_name, "state": state_sigla}
                city_url = f"{SUPABASE_URL}/rest/v1/city_info"
                res_city = supabase_request(city_url, data=city_payload)
                
                # Busca ID 
                city_id = res_city[0]['id'] if res_city and isinstance(res_city, list) and len(res_city) > 0 else None
                if not city_id:
                    safe_city = urllib.parse.quote(city_name)
                    safe_state = urllib.parse.quote(state_sigla)
                    cities = supabase_request(f"{SUPABASE_URL}/rest/v1/city_info?city=eq.{safe_city}&state=eq.{safe_state}", method="GET")
                    if cities: city_id = cities[0]['id']

            # 2. Montar Payload do Imóvel
            prop_payload = {
                "code": code,
                "city": city_name,
                "state": state_sigla,
                "neighborhood": row.get("BAIRRO", ""),
                "address": row.get("RUA", "") or "",
                "property_type": map_property_type(row.get("TIPO DE IMOVEL", "")),
                "stage": map_stage(row.get("FASE", "")),
                "occupation_status": map_occupation(row.get("STATUS OCUPAÇÃO", "")),
                "area_total": clean_area(row.get("ÁREA DO TERRENO", 0)),
                "area_useful": clean_area(row.get("ÁREA CONSTR. / PRIVAT.", 0)),
                "purchase_price": clean_currency(row.get("VALOR ARREMATAÇÃO", 0)),
                "down_payment_value": clean_currency(row.get("VALOR ENTRADA", 0)),
                "financing_value": clean_currency(row.get("VALOR SALDO FINANCIAM.", 0)),
                "listed_price": clean_currency(row.get("VALOR ESPERADO DE VENDA", 0)),
                "itbi_cost": clean_currency(row.get("VALOR ITBI", 0)),
                "documentation_cost": clean_currency(row.get("VALOR ESCRITURA", 0)),
                "registration_cost": clean_currency(row.get("VALOR REGISTRO", 0)),
                "eviction_cost": clean_currency(row.get("VALOR DESOCUPAÇÃO", 0)),
                "renovation_cost": clean_currency(row.get("VALOR REFORMA", 0)),
                "iptu_debts": clean_currency(row.get("VALOR DEBITOS IPTU", 0)),
                "condo_debts": clean_currency(row.get("VALOR DEBITOS CONDOM.", 0)),
                "notes": row.get("OBS UNICA DO IMOVEL", ""),
                "maps_url": row.get("LINK DO MAPS", ""),
                "drive_url": row.get("LINK DRIVE", ""),
            }
            
            # Upsert Property
            res_prop = supabase_request(f"{SUPABASE_URL}/rest/v1/properties", data=prop_payload)
            prop_id = res_prop[0]['id'] if res_prop and isinstance(res_prop, list) and len(res_prop) > 0 else None

            if not prop_id:
                props = supabase_request(f"{SUPABASE_URL}/rest/v1/properties?code=eq.{code}", method="GET")
                if props: prop_id = props[0]['id']

            if not prop_id:
                print(f"❌ Erro ao criar imóvel {code}")
                continue

            # 3. Processar Atualizações Cronológicas
            for col_name, col_value in row.items():
                if not col_name or not col_value or str(col_value).strip() == "" or col_value == "0":
                    continue
                
                date_str = None
                col_name_str = str(col_name)
                if col_name_str.startswith("ATT-"):
                    date_str = col_name_str.replace("ATT-", "").strip()
                elif re.match(r'\d{2}/\d{2}/\d{4}', col_name_str) or re.match(r'\d{2}-\d{2}-\d{4}', col_name_str):
                    date_str = col_name_str.strip()
                
                if date_str:
                    dt = None
                    for fmt in ("%d/%m/%Y", "%d-%m-%Y"):
                        try:
                            dt = datetime.strptime(date_str, fmt)
                            break
                        except: continue
                    
                    if dt:
                        iso_date = dt.strftime("%Y-%m-%d")
                        update_payload = {
                            "property_id": prop_id,
                            "content": str(col_value),
                            "update_date": iso_date
                        }
                        supabase_request(f"{SUPABASE_URL}/rest/v1/property_updates", data=update_payload)

    print("✅ Importação finalizada!")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        import_data(sys.argv[1])
    else:
        print("Uso: python import_properties.py seu_arquivo.csv")
