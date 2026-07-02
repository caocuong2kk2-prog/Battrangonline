$images = Get-ChildItem -Path "user/assets/images" -File
$codeFiles = Get-ChildItem -Path "user" -Include *.html,*.js,*.css -Recurse | Where-Object { $_.FullName -notmatch "user\\assets\\images" }

foreach ($img in $images) {
    if ($img.Name -eq "IMAGES_NEEDED.txt" -or $img.Name -eq "placeholder.html") { continue }
    $found = $false
    foreach ($file in $codeFiles) {
        if (Select-String -Path $file.FullName -Pattern $img.Name -Quiet) {
            $found = $true
            break
        }
    }
    if (-not $found) {
        Write-Host "Unused: $($img.Name)"
    }
}
Write-Host "Analysis complete."
