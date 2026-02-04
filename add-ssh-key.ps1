# Script to add SSH key to server
$pubkey = Get-Content C:\Users\pc\.ssh\id_ed25519.pub
$command = "mkdir -p ~/.ssh && echo '$pubkey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
ssh root@153.92.223.119 $command

Write-Host "SSH key added successfully!" -ForegroundColor Green
Write-Host "Test connection: ssh root@153.92.223.119" -ForegroundColor Yellow

