$unused = @(
    "about-craftsman.png",
    "about-products.png",
    "about-workshop.png",
    "bg.jpeg",
    "bg.jpg",
    "guide_step1.png",
    "guide_step2.png",
    "guide_step3.png",
    "guide_step4.png",
    "guide_step5.png",
    "hero-bg.jpg",
    "home_bg.jpeg",
    "placeholder.png",
    "policy-privacy.png",
    "policy-return.png",
    "policy-shipping.png",
    "policy-shopping-guide.png",
    "policy-warranty.png",
    "product-1-2.jpg",
    "products-banner.jpg",
    "product_bg.jpeg",
    "team-husband.jpg",
    "team-wife.jpg",
    "tranh.jpg",
    "video-thumb-1.jpg",
    "video-thumb-2.jpg",
    "video-thumb-3.jpg",
    "video-thumb-4.jpg",
    "video-thumb-5.jpg",
    "video-thumb-6.jpg"
)

$count = 0
foreach ($img in $unused) {
    $path = "user/assets/images/$img"
    if (Test-Path $path) {
        Remove-Item -Path $path -Force
        Write-Host "Deleted $img"
        $count++
    }
}
Write-Host "Total deleted: $count"
