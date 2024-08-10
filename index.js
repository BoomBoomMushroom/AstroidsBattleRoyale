const deg2rad = Math.PI/180

const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
const pixelSize = 5

ctx.globalCompositeOperation = 'destination-over';

canvas.width = window.innerWidth
canvas.height = window.innerHeight

let imageAssets = {
    "ship": null,
    "shipThrust": null,
}
loadImage("./assets/ship.png", "ship", 0.15)
loadImage("./assets/ship_thrust.png", "shipThrust", 0.15)

let shipColoredImages = {}
let keyboard = {}
let lastFrame = Date.now()

let shipAccel = 3
let maxSpeed = 300
let minSpeed = 2
let worldSize = [500, 500]

let rotateSpeed = 150
let bulletSpeed = 300
let asteroidSpeed = [1, 5]
let shootCooldown = 0.25
let hyperspaceCooldown = 1
let friction = 0.1

let bullets = []
let asteroids = []

let mouse = {x: 0, y: 0}

let shipEntity = {
    x: 90, y: 90, vx: 0, vy: 0, rotation: 0, shootCooldown: 0, hyperspaceCooldown: 0, isThrusting: false
}

function randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min
}
function randomFloat(min, max){
    return (Math.random() * (max - min + 1)) + min
}

function shootBullet(x, y, angle){
    bullets.push({
        x: x,
        y: y,
        vx: (Math.cos(angle) * bulletSpeed) + shipEntity.vx,
        vy: (Math.sin(angle) * bulletSpeed) + shipEntity.vy,
        lifespan: 10,
    })
}

function randomAsteroid(x, y, points=7, radius=10){
    let minRadius = radius * 0.5
    let maxRadius = radius * 2

    let velocityAngle = randomFloat(0, 360)
    let asteroidSpeedLocal = randomFloat(asteroidSpeed[0], asteroidSpeed[1])

    let newAsteroid = {
        x: x,
        y: y,
        vx: Math.cos(velocityAngle) * asteroidSpeedLocal,
        vy: Math.sin(velocityAngle) * asteroidSpeedLocal,
        points: []
    }
    
    let angleIncrement = 360 / points
    for(let i=0; i < 360; i+= angleIncrement){
        let r = randomFloat(minRadius, maxRadius)
        let x = Math.cos(i * deg2rad) * r
        let y = Math.sin(i * deg2rad) * r
        newAsteroid.points.push({x: x, y: y})
    }

    return newAsteroid
}

function spawnRandomAsteroid(points=7){
    let spawnOnRoof = randomInt(0, 1) == 1

    let newAsteroid = randomAsteroid(
        spawnOnRoof ? (randomInt(0, worldSize[0])) : (randomInt(0, 1) == 0 ? 0 : worldSize[1]),
        spawnOnRoof == false ? (randomInt(0, worldSize[1])) : (randomInt(0, 1) == 0 ? 0 : worldSize[0]),
        points,
        10,
    )

    asteroids.push(newAsteroid)
}

function drawAsteroid(data){
    let startPoint = data.points[0]
    let offsetX = data.x
    let offsetY = data.y

    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = pixelSize
    
    ctx.beginPath()
    ctx.moveTo(startPoint.x + offsetX, startPoint.y + offsetY)
    for(let i=1; i<data.points.length; i++){
        let pointB = data.points[i]
        ctx.lineTo(pointB.x + offsetX, pointB.y + offsetY);
    }
    ctx.lineTo(startPoint.x + offsetX, startPoint.y + offsetY)
    ctx.closePath()
    ctx.stroke()
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

        let imgScaled = new Image();
        imgScaled.src = imgCanvas.toDataURL();
        imageAssets[assetName] = imgScaled
    }
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

function drawImage(x, y, rotation=0, image, pivotPoint={x:Infinity, y:Infinity}){
    if(image == null){return}

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

function getShipHitboxPoints(shipData){
    let shipImage = imageAssets["ship"]
    let shipImageWidth = shipImage.width
    let shipImageHeight = shipImage.height

    // ship hit box points
    let pointA = {x: shipData.x + shipImageWidth/2, y: shipData.y}
    let pointB = {x: shipData.x + 4, y: shipData.y + shipImageHeight - 7}
    let pointC = {x: shipData.x + shipImageWidth - 4, y: pointB.y}

    // transform positions based off rotation
    let pivotPoint = {x: shipData.x + shipImageWidth/2, y: shipData.y + shipImageHeight/2}
    let angle = shipData.rotation * deg2rad

    pointA = rotatePoint(pointA, pivotPoint, angle)
    pointB = rotatePoint(pointB, pivotPoint, angle)
    pointC = rotatePoint(pointC, pivotPoint, angle)
    
    return [pointA, pointB, pointC];
}

function drawShip(data){
    let shipImage = data.isThrusting ? imageAssets["shipThrust"] : imageAssets["ship"]

    drawImage(data.x, data.y, data.rotation, shipImage)
}

function worldWrap(x, y){
    
}

function draw(){
    let deltaTime = Date.now() - lastFrame
    deltaTime /= 1000 // get it in seconds; ex 800ms -> 0.8s

    shipEntity.shootCooldown -= deltaTime
    shipEntity.hyperspaceCooldown -= deltaTime

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    for(let i=0; i<bullets.length; i++){
        let b = bullets[i]
        b.x += b.vx * deltaTime
        b.y += b.vy * deltaTime
        b.lifespan -= deltaTime
        
        if(b.lifespan <= 0){
            bullets.splice(i, 1)
            i -= 1 // to counteract i++; keeps i the same and continues reading the array
        }

        drawGlowingPixel(b.x, b.y, "rgba(255, 255, 255, 1)", 15)
    }

    for(let i=0; i<asteroids.length; i++){
        let a = asteroids[i]
        a.x += a.vx * deltaTime
        a.y += a.vy * deltaTime

        drawAsteroid(a)
    }

    if(keyboard["a"]){
        shipEntity.rotation -= rotateSpeed * deltaTime
    }
    else if(keyboard["d"]){
        shipEntity.rotation += rotateSpeed * deltaTime
    }

    if(keyboard["w"]){
        shipEntity.isThrusting = true
        shipEntity.vx += Math.cos( (shipEntity.rotation - 90) * deg2rad ) * shipAccel
        shipEntity.vy += Math.sin( (shipEntity.rotation - 90) * deg2rad ) * shipAccel
    } else{ shipEntity.isThrusting = false }
    
    // Slow ship down with friction, max speed, and move ship based of velocity
    if(shipEntity.vx != 0){ shipEntity.vx += friction * -Math.sign(shipEntity.vx) * deltaTime }
    if(shipEntity.vy != 0){ shipEntity.vy += friction * -Math.sign(shipEntity.vy) * deltaTime }

    if(Math.abs(shipEntity.vx) < minSpeed){ shipEntity.vx = 0 }
    if(Math.abs(shipEntity.vy) < minSpeed){ shipEntity.vy = 0 }

    if(Math.abs(shipEntity.vx) >= maxSpeed){ shipEntity.vx = maxSpeed * Math.sign(shipEntity.vx) }
    if(Math.abs(shipEntity.vy) >= maxSpeed){ shipEntity.vy = maxSpeed * Math.sign(shipEntity.vy) }

    shipEntity.x += shipEntity.vx * deltaTime
    shipEntity.y += shipEntity.vy * deltaTime

    //console.log(shipEntity)

    if(imageAssets["ship"] != null){
        drawShip(shipEntity)

        // the image is rotated by 90 degrees so add it to shoot and bullet calc
        let shipImage = imageAssets["ship"]
        let pivotX = shipEntity.x + shipImage.width/2
        let pivotY = shipEntity.y + shipImage.height/2
        let quarterTurnRad = 90 * deg2rad
        let shootRadius = (shipImage.height/2) - 10
        let shootAngle = (shipEntity.rotation * deg2rad) - quarterTurnRad
        let bulletShotPosition = {x: Math.cos(shootAngle) * shootRadius + pivotX, y: Math.sin(shootAngle) * shootRadius + pivotY}

        if(keyboard[" "] && shipEntity.shootCooldown <= 0){
            shipEntity.shootCooldown = shootCooldown
            shootBullet(bulletShotPosition.x - (pixelSize/2), bulletShotPosition.y - (pixelSize/2), shootAngle)
        }
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
window.addEventListener("mousemove", (e)=>{
    mouse = {x: e.clientX, y: e.clientY}
})