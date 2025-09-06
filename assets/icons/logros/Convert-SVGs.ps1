param(
  [string]$InputDir = ".",
  [string]$OutDir   = "png",
  [int]$Width       = 0,          # 0 = auto
  [int]$Height      = 0,          # 0 = auto
  [int]$DPI         = 96,
  [string]$Background = "transparent"  # "transparent" o un color p.ej. "#FFFFFFFF"
)

if (-not (Get-Command inkscape -ErrorAction SilentlyContinue)) {
  Write-Error "No encuentro 'inkscape' en el PATH. Instálalo primero."
  exit 1
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$files = Get-ChildItem -Path $InputDir -Filter *.svg
$converted = 0

foreach ($f in $files) {
  $base = [System.IO.Path]::GetFileNameWithoutExtension($f.FullName)
  $out  = Join-Path $OutDir ($base + ".png")

  $args = @("$($f.FullName)", "--export-type=png", "--export-filename=$out", "--export-dpi=$DPI")

  if ($Width  -gt 0) { $args += "--export-width=$Width" }
  if ($Height -gt 0) { $args += "--export-height=$Height" }

  if ($Background -eq "transparent") {
    $args += "--export-background-opacity=0"
  } else {
    $args += @("--export-background=$Background", "--export-background-opacity=1")
  }

  & inkscape @args | Out-Null
  Write-Host "✓ $out"
  $converted++
}

Write-Host "Listo: $converted archivo(s) convertido(s) → $OutDir"
