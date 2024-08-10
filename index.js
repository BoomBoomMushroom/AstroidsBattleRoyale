const deg2rad = Math.PI/180

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
let keyboard = {}
let lastFrame = Date.now()

let rotateSpeed = 150
let bulletSpeed = 1
let shootCooldown = 0.25
let hyperspaceCooldown = 1

let bullets = []

let shipEntity = {
    x: 90, y: 90, vx: 0, vy: 0, rotation: 0, shootCooldown: 0, hyperspaceCooldown: 0
}

function shootBullet(x, y, angle){
    bullets.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * bulletSpeed,
        vy: Math.sin(angle) * bulletSpeed,
    })
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

function drawImage(x, y, rotation=0, image){
    ctx.save()
    
    let pivotX = x + image.width/2
    let pivotY = y + image.height/2
    ctx.translate(pivotX, pivotY)
    let rads = rotation * deg2rad
    ctx.rotate(rads)
    ctx.translate(-pivotX, -pivotY)
    ctx.drawImage(image, x, y)

    ctx.restore()
}

function pointInTriangle(point, v1, v2, v3){
    function sign(p1, p2, p3){
        return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    }
    
    let d1 = sign(point, v1, v2)
    let d2 = sign(point, v2, v3)
    let d3 = sign(point, v3, v1)

    let hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    let hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(hasNeg && hasPos)
}

function rotatePoint(point, pivotPoint, angle = 0){
    let sin = Math.sin(angle)
    let cos = Math.cos(angle)

    point.x = point.x - pivotPoint.x
    point.y = point.y - pivotPoint.y

    let newX = point.x * cos - point.y * sin
    let newY = point.x * sin + point.y * cos

    point.x = newX + pivotPoint.x
    point.y = newY + pivotPoint.y

    return point
}

function drawShip(data, color){
    let shipImage = shipColoredImages[color]
    let shipImageWidth = shipImage.width
    let shipImageHeight = shipImage.height

    drawImage(data.x, data.y, data.rotation, shipImage)

    // ship hit box points
    let pointA = {x: data.x + shipImageWidth/2, y: data.y}
    let pointB = {x: data.x + 4, y: data.y + shipImageHeight - 7}
    let pointC = {x: data.x + shipImageWidth - 4, y: pointB.y}

    // transform positions based off rotation
    let pivotPoint = {x: data.x + shipImageWidth/2, y: data.y + shipImageHeight/2}
    let angle = data.rotation * deg2rad

    pointA = rotatePoint(pointA, pivotPoint, angle)
    pointB = rotatePoint(pointB, pivotPoint, angle)
    pointC = rotatePoint(pointC, pivotPoint, angle)



    // draw said points
    drawGlowingPixel(pivotPoint.x, pivotPoint.y, "#FFFFFF", 0)

    drawGlowingPixel(pointA.x - (pixelSize/2), pointA.y - (pixelSize/2), "#FFFFFF", 10)
    drawGlowingPixel(pointB.x - (pixelSize/2), pointB.y - (pixelSize/2), "#FFFFFF", 10)
    drawGlowingPixel(pointC.x - (pixelSize/2), pointC.y - (pixelSize/2), "#FFFFFF", 10)
}

function draw(){
    let deltaTime = Date.now() - lastFrame
    deltaTime /= 1000 // get it in seconds; ex 800ms -> 0.8s

    shipEntity.shootCooldown -= deltaTime
    shipEntity.hyperspaceCooldown -= deltaTime

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    for(let i=0; i<bullets.length; i++){
        bullets[i].x += bullets[i].vx
        bullets[i].y += bullets[i].vy
        let b = bullets[i]
        drawGlowingPixel(b.x, b.y, "rgba(255, 255, 255, 1)", 15)
    }

    if(keyboard["a"]){
        shipEntity.rotation -= rotateSpeed * deltaTime
    }
    else if(keyboard["d"]){
        shipEntity.rotation += rotateSpeed * deltaTime
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
        
        // the image is rotated by 90 degrees so add it to shoot and bullet calc
        let pivotX = shipEntity.x + shipColoredImages["red"].width/2
        let pivotY = shipEntity.y + shipColoredImages["red"].height/2
        let quarterTurnRad = 90 * deg2rad
        let shootRadius = (shipColoredImages["red"].height / 2) - 10
        let shootAngle = (shipEntity.rotation * deg2rad) - quarterTurnRad
        let bulletShotPosition = {x: Math.cos(shootAngle) * shootRadius + pivotX, y: Math.sin(shootAngle) * shootRadius + pivotY}

        if(keyboard[" "] && shipEntity.shootCooldown <= 0){
            shipEntity.shootCooldown = shootCooldown
            shootBullet(bulletShotPosition.x, bulletShotPosition.y, shootAngle)
        }

        drawShip(shipEntity, "red")
    }

    lastFrame = Date.now()
    requestAnimationFrame(draw)
}

draw()

window.addEventListener("keydown", (e)=>{
    keyboard[e.key] = true
})
window.addEventListener("keyup", (e)=>{
    keyboard[e.key] = false
})