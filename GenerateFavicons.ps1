$size = 32
$bitmap = New-Object System.Drawing.Bitmap $size, $size
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush([System.Drawing.PointF]::new(0,0),[System.Drawing.PointF]::new($size,$size),'#0891b2','#14b8a6')
$graphics.FillEllipse($brush,0,0,$size,$size)
$font = New-Object System.Drawing.Font('Segoe UI',[int](($size-4)*0.4),System.Drawing.FontStyle.Bold)
$graphics.DrawString('P',$font,System.Drawing.Brushes.White,New-Object System.Drawing.PointF(6,8))
$bitmap.Save('public\\brand\\favicon-32.png')
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Created favicon-32.png"

$size16 = 16
$bitmap16 = New-Object System.Drawing.Bitmap $size16, $size16
$graphics16 = [System.Drawing.Graphics]::FromImage($bitmap16)
$brush16 = New-Object System.Drawing.Drawing2D.LinearGradientBrush([System.Drawing.PointF]::new(0,0),[System.Drawing.PointF]::new($size16,$size16),'#0891b2','#14b8a6')
$graphics16.FillEllipse($brush16,0,0,$size16,$size16)
$font16 = New-Object System.Drawing.Font('Segoe UI',[int](($size16-2)*0.35),System.Drawing.FontStyle.Bold)
$graphics16.DrawString('P',$font16,System.Drawing.Brushes.White,New-Object System.Drawing.PointF(3,5))
$bitmap16.Save('public\\brand\\favicon-16.png')
$graphics16.Dispose()
$bitmap16.Dispose()
Write-Host "Created favicon-16.png"