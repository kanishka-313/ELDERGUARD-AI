$sources = Get-ChildItem -Recurse -Filter "*.java" -Path "backend\src\main\java" | ForEach-Object { $_.FullName }
Write-Host "Compiling $($sources.Count) Java files..."
& javac -cp "backend/lib/*" -d "backend/bin" $sources
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Java Backend Compilation SUCCESSFUL (0 errors)"
} else {
    Write-Host "❌ Compilation FAILED with exit code $LASTEXITCODE"
}
