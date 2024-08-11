import {WebSocketServer} from "ws"

const PORT = 8000;

const wss = new WebSocketServer({port : PORT}, () => {
    console.log("server running on port: ", PORT)
})

wss.on("connection", (connection, req) => {
    connection.on("message", (data: Buffer)=>{
        console.log(data.toString());
        connection.send("server response");
    })

    connection.on("close", ()=>{
        console.log("connection closed")
    })
})