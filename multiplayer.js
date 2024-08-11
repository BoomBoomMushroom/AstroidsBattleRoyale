var peer = new Peer();
var myUsername = "Guest"
var maxUsernameLength = 16
var myCode = generateShortCode(6)
var connection = null
var gameStarted = false

var clients = {}

var params = new URLSearchParams(window.location.search)
var urlCode = ""
for (const [key, value] of params){
    if(key == "code"){ urlCode = value }
    join(urlCode)
}

function generateShortCode(length = 5) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

function host(){
    if(token == "") { return }
    peer = new Peer(myCode)
    peer.on('connection', onConnection)
    peer.on('open', ()=>{
        console.log("Hosting with Room Code: " + myCode)
        document.getElementById("startGameButton").disabled = false

        names = [myUsername]

        generateElementsForScore(myUsername)
        setLobbyToVisible(myCode)
        openPregame()
    })
}
function join(roomID){
    if(roomID == null){ roomID = getCode() }
    roomID = roomID.toUpperCase()
    connection = peer.connect(roomID)
    //console.log(connection)
    if(connection == null){
        if(urlCode != ""){
            alert("Connection Error! Try again...")
            window.location.search = ""
        }
        else{
            window.location.href += "?code=" + roomID
        }
    }
    connection.on('open', connectionOpen)
    connection.on('data', onData)
}


function addPlayer(conn){
    id = conn.connectionId
    console.log(id + " has joined")

    clients[id] = conn
}
function removePlayer(conn){
    id = conn.connectionId
    console.log(id + " has left")

    let leavingUsername = clients[id].username

    names.indexOf(leavingUsername)
    delete clients[conn.connectionId]
}

function getClientIds(){
    return Object.keys(clients)
}
function sendToClient(connectionId, data){
    client = clients[connectionId]
    if(client == null){ return false }
    client.send(data)
    return true
}
function sendToEveryone(data){
    clientIds = getClientIds()
    for(let i=0; i<clientIds.length; i++){
        clientId = clientIds[i]
        sendToClient(clientId, data)
    }
}

function onData(data, id){
    jsonData = JSON.parse(data)
    command = jsonData["command"]

    switch(command){
        case "setName":
            // username to set
            let username = jsonData["parameters"][0]
            let repeats = 0
            for(let i=0; i<names.length; i++){
                if(names[i].split(" ")[0] == username){ repeats++ }
            }
            if(repeats > 0){ username += " " + (repeats+1) }

            clientConnection = clients[jsonData["id"]]

            if(username != jsonData["parameters"][0]){
                clientConnection.send(JSON.stringify({
                    "command": "updateUsername",
                    "parameters": [username]
                }))
            }

            clientConnection.username = username
            names.push(username)

            generateElementsForScore(username)
            sendToEveryone(JSON.stringify({
                "command": "generateElementScore",
                "parameters": [username]
            }))
            break
        case "startGame":
            break
        case "updateUsername":
            myUsername = jsonData["parameters"][0]
            break
        case "names":
            if(connection != null){
                // make sure we're a client before we override the names
                names = jsonData["parameters"][0]
            }
            break
        case "nextRound":
            break
        case "endGame":
            break
        case "gameInProgressPleaseLeave":
            if(connection != null){
                connection.close()
            }
            break
    }
    console.log(jsonData)
}

function connectionOpen(){
    startupData = {
        "id": connection.connectionId,
        "command": "setName",
        "parameters": [myUsername],
    }
    connection.send(JSON.stringify(startupData))
    setLobbyToVisible(connection.peer)
    openPregame()
}

function onConnection(conn){
    if(gameStarted){
        conn.send(JSON.stringify({
            "command": "gameInProgressPleaseLeave",
            "parameters": []
        }))
        return
    }

    id = conn.connectionId
    conn.on('open', ()=>{
        addPlayer(conn)
    })
    conn.on('close', ()=>{
        removePlayer(conn)
    })
    conn.on('data', (data)=>{
        onData(data, id)
    })
}