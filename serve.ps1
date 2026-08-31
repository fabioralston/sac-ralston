param(
  [int]$Port = 5500
)

$root = Join-Path $PSScriptRoot "public"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

$mime = @{
  ".html" = "text/html"; ".css" = "text/css"; ".js" = "application/javascript"
  ".json" = "application/json"; ".png" = "image/png"; ".jpg" = "image/jpeg"
  ".svg" = "image/svg+xml"; ".ico" = "image/x-icon"
}

Write-Host "Servindo $root em http://localhost:$Port/  (Ctrl+C para parar)"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $request.Url.LocalPath
    if ($path -eq "/") { $path = "/index.html" }
    $filePath = Join-Path $root ($path.TrimStart("/") -replace "/", [IO.Path]::DirectorySeparatorChar)

    if (Test-Path $filePath -PathType Leaf) {
      $ext = [IO.Path]::GetExtension($filePath)
      $contentType = $mime[$ext]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $bytes = [IO.File]::ReadAllBytes($filePath)
      $response.ContentType = $contentType
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
      $notFound = [Text.Encoding]::UTF8.GetBytes("404 - Arquivo nao encontrado: $path")
      $response.OutputStream.Write($notFound, 0, $notFound.Length)
    }
    $response.OutputStream.Close()
  }
} finally {
  $listener.Stop()
}
