$sourceFiles = @(
    "user/css/layout.css",
    "user/css/home.css",
    "user/css/responsive.css",
    "user/css/promo.css"
)

$outputFile = "user/css/all.min.css"

$combined = ""
foreach ($file in $sourceFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw -Encoding UTF8
        $combined += "`n" + $content
        Write-Host "Bundled $file"
    } else {
        Write-Warning "File not found: $file"
    }
}

# Remove comments
$minified = $combined -replace '/\*[\s\S]*?\*/', ''
# Remove newlines and tabs
$minified = $minified -replace '[\r\n\t]', ' '
# Remove redundant spaces
$minified = $minified -replace '\s+', ' '
# Remove spaces around important characters
$minified = $minified -replace '\s*{\s*', '{'
$minified = $minified -replace '\s*}\s*', '}'
$minified = $minified -replace '\s*;\s*', ';'
$minified = $minified -replace '\s*:\s*', ':'
$minified = $minified -replace '\s*,\s*', ','

# Trim leading/trailing spaces
$minified = $minified.Trim()

Set-Content $outputFile -Value $minified -Encoding UTF8
Write-Host "Successfully compiled and minified to $outputFile"
