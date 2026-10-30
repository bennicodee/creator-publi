# Mostra o resumo de uso da produção (contas, uso, assinaturas e acessos do dia).
# Uso, na raiz do projeto:  .\api\deploy\resumo.ps1
# O script stats.sh vai pelo SSH e roda no servidor; nada é instalado nem alterado lá.

# Acentos certos na tela (o padrão do console do Windows não é UTF-8).
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

# Vai em base64 (só letras e números): o PowerShell 5.1 não mexe no texto no caminho.
$script = [IO.File]::ReadAllText("$PSScriptRoot\stats.sh").TrimStart([char]0xFEFF) -replace "`r", ""
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
ssh -i "$HOME\.ssh\id_ed25519_creatorpubli" -p 22022 root@143.95.174.102 "echo $b64 | base64 -d | bash"
