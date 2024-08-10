const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
const pixelSize = 5

canvas.width = window.innerWidth
canvas.height = window.innerHeight

let imageAssets = {
    "ship": null
}
loadImage("./assets/ship.png", "ship")


let bullets = [
    {x: 0, y: 0, vx: 1, vy: 1}
]

let shipEntity = {
    x: 0, y: 0, angle: 0
}

function loadImage(src, assetName, scale=1){
    let img = new Image()
    img.src = src
    img.onload = ()=>{
        let newWidth = img.width * scale
        let newHieght = img.width * scale

        let imgCanvas = document.createElement('canvas')
        imgCanvas.width = img.width
        imgCanvas.height = img.height
        let imgCtx = imgCanvas.getContext("2d")
        imgCtx.drawImage(img, 0, 0)
        let imageData = imgCtx.getImageData(0, 0, imgCanvas.width, imgCanvas.height)
        imageAssets[assetName] = imageData
    }
}

function modulateAsset(assetName, color){
    let data = imageAssets[assetName].data
    for (let i = 0; i < data.length; i += 4) {
        data[i] = color.r
        data[i + 1] = color.g
        data[i + 2] = color.b
    }
    return imageAssets[assetName]
}

function drawPixel(x, y, color){
    ctx.fillStyle = color
    ctx.fillRect(x, y, pixelSize, pixelSize)
}

function drawGlowingPixel(x, y, color, intensity){
    ctx.save()

    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = intensity
    
    drawPixel(x, y, color)
    ctx.restore()
}

function draw(){
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    for(let i=0; i<bullets.length; i++){
        bullets[i].x += bullets[i].vx
        bullets[i].y += bullets[i].vy
        let b = bullets[i]
        drawGlowingPixel(b.x, b.y, "rgba(255, 255, 255, 1)", 15)
    }

    if(imageAssets["ship"] != null){
        let shipImageData = modulateAsset("ship", {r: 0, g: 255, b: 0})
        ctx.putImageData(shipImageData, shipEntity.x, shipEntity.y)
    }

    requestAnimationFrame(draw)
}
draw()

// Simulate bloom (using a library like StackBlur)
//stackBlurImage(canvas, 0, 0, canvas.width, canvas.height, 5) // Adjust radius as needed