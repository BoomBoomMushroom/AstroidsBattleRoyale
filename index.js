const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
const pixelSize = 5

ctx.globalCompositeOperation = 'destination-over';

canvas.width = window.innerWidth
canvas.height = window.innerHeight

let imageAssets = {
    "ship": null
}
loadImage("./assets/ship.png", "ship", 0.15)

let shipColoredImages = {}

let bullets = [
    {x: 0, y: 0, vx: 1, vy: 1}
]

let shipEntity = {
    x: 90, y: 90, vx: 0, vy: 0, rotation: 0
}

function loadImage(src, assetName, scale=1){
    let img = new Image()
    img.src = src
    img.onload = ()=>{
        let newWidth = Math.ceil(img.width * scale)
        let newHeight = Math.ceil(img.height * scale)

        let imgCanvas = document.createElement('canvas')
        imgCanvas.width = newWidth
        imgCanvas.height = newHeight
        let imgCtx = imgCanvas.getContext("2d")
        imgCtx.drawImage(img, 0, 0, newWidth, newHeight)
        let imageData = imgCtx.getImageData(0, 0, newWidth, newHeight)
        imageAssets[assetName] = imageData
    }
}

function modulateAsset(assetName, color){
    let asset = imageAssets[assetName]

    // make new clone of image so we dont override the original
    let data = new Uint8ClampedArray(asset.data)
    data.set(asset.data)

    let imageData = new ImageData(data, asset.width, asset.height)
    for (let i = 0; i < data.length; i += 4) {
        data[i] = color.r
        data[i + 1] = color.g
        data[i + 2] = color.b
    }
    return imageData
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

function drawImage(x, y, rotation, image){
    ctx.save()
    
    let pivotX = x + image.width/2
    let pivotY = y + image.height/2
    ctx.translate(pivotX, pivotY)
    let rads = rotation * (Math.PI/180)
    ctx.rotate(rads)
    ctx.translate(-pivotX, -pivotY)
    ctx.drawImage(image, x, y)

    // where the bullet should come out of
    drawGlowingPixel(Math.cos(rads) + x, Math.sin(rads) + y, "#FFFFFF")

    shipEntity.rotation += 1

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
        // precompile colored ship images
        let shipColors = [
            ["red", {r: 245, g: 73, b: 73}],
            ["blue", {r: 73, g: 142, b: 245}],
            ["yellow", {r: 245, g: 255, b: 73}],
            ["pink", {r: 239, g: 73, b: 245}],
        ]
        if(Object.keys(shipColoredImages).length < shipColors.length){
            for(let i=0;i<shipColors.length;i++){
                let clrName = shipColors[i][0]
                let clrValue = shipColors[i][1]
                if(!(clrName in shipColoredImages)){
                    let imageData = modulateAsset("ship", clrValue)

                    // convert to image for drawImage
                    let tempCanvas = document.createElement('canvas');
                    tempCanvas.width = imageData.width;
                    tempCanvas.height = imageData.height;
                    let tempCtx = tempCanvas.getContext('2d');
                    tempCtx.putImageData(imageData, 0, 0);
                    const img = new Image();
                    img.src = tempCanvas.toDataURL();

                    shipColoredImages[clrName] = img
                }
            }
        }
        // done w/ precompile
        
        drawImage(shipEntity.x, shipEntity.y, shipEntity.rotation, shipColoredImages["red"])
    }

    requestAnimationFrame(draw)
}

draw()
