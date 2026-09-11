param(
 [Parameter(Mandatory=$true)][string]$Source,
 [Parameter(Mandatory=$true)][string]$Destination
)
$ErrorActionPreference='Stop'
$required=@('app/server-defaults.ts','package.json','README.md','ADMIN-SETUP.md','ENVIRONMENT.example','next.config.ts','vercel.json')
foreach($file in $required){
 if(!(Test-Path -LiteralPath (Join-Path $Source $file))){ throw "Missing $file" }
}
$static=Join-Path $Source '.next/static'
if(Test-Path -LiteralPath $static){
 $leaks=Get-ChildItem -LiteralPath $static -Recurse -File | Where-Object { (Get-Content -LiteralPath $_.FullName -Raw) -match 'rediss:|upstash.io|harmless-jay' }
 if($leaks){ throw ('Credential leaked in static bundle: ' + $leaks[0].FullName) }
}
if(Test-Path -LiteralPath (Join-Path $Source 'node_modules')){ throw 'Package must be compressed before installing local dependencies.' }
if(Test-Path -LiteralPath (Join-Path $Source '.next')){ throw 'Package must exclude build output; Vercel builds from source.' }
if(Test-Path -LiteralPath $Destination){ Remove-Item -LiteralPath $Destination -Force }
Compress-Archive -Path (Join-Path $Source '*') -DestinationPath $Destination -CompressionLevel Optimal
$size=[Math]::Round((Get-Item -LiteralPath $Destination).Length/1MB,2)
Write-Output "ZIP created: $Destination ($size MB)"
