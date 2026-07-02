$files = Get-ChildItem -Path "user/assets/images/process-*.png"

foreach ($file in $files) {
    $newName = $file.FullName -replace '\.png$', '.webp'
    Write-Host "Converting $($file.Name) to WebP..."
    ffmpeg -y -i $file.FullName -c:v libwebp -quality 80 $newName
    if ($?) {
        Remove-Item $file.FullName
        Write-Host "Deleted original $($file.Name)"
    }
}
Write-Host "Conversion complete."
