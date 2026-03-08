Endpoint /api/dump

Uso:
- Defina na VPS as variáveis de ambiente:
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - (Opcional) DUMP_TOKEN - se definido, deverá ser enviado no header x-dump-token

Exemplo (PowerShell):

$headers = @{ 'x-dump-token' = 'SEU_TOKEN_SEGURO' }
Invoke-RestMethod -Uri "http://localhost:3000/api/dump" -Method Get -Headers $headers | ConvertTo-Json -Depth 10 | Out-File dump.json -Encoding utf8

Ou usando query string: http://host/api/dump?token=SEU_TOKEN_SEGURO

Retorna JSON com as propriedades: modulos, inversores, fornecedores, string_boxes, cabos, concessionarias, estruturas
