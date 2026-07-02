$files = @("user/css/layout.css", "user/css/home.css", "user/css/responsive.css")

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        # Remove comments
        $content = $content -replace '/\*[\s\S]*?\*/', ''
        # Remove newlines and tabs
        $content = $content -replace '[\r\n\t]', ' '
        # Remove redundant spaces
        $content = $content -replace '\s+', ' '
        # Remove spaces around important characters
        $content = $content -replace '\s*{\s*', '{'
        $content = $content -replace '\s*}\s*', '}'
        $content = $content -replace '\s*;\s*', ';'
        $content = $content -replace '\s*:\s*', ':'
        $content = $content -replace '\s*,\s*', ','
        
        Set-Content $file -Value $content -Encoding UTF8
        Write-Host "Minified $file"
    }
}
Write-Host "Done minifying CSS."
