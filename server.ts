import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import url from 'url';
import { IncomingMessage } from 'http';
import dotenv from 'dotenv'

dotenv.config();
const PORT = Number(process.env.PORT) || 8000;

// INTERFACE REPRESENTING CONNECTION DETAILS
interface ConnectionDetails {
    username: string | string[] | undefined;
    id: string;
}

// TYPE REPRESENTING THE CONNECTIONS AND MEMBERS 
type Connections = Record<string, WebSocket>;
type Members = Record<string, string | string[] | undefined>;  //string[] : empty string

// ACTIVE CONNECTIONS AND MEMBERS
const connections: Connections = {};
const members: Members = {};

// BROADCAST
const broadcast = (message: string) => {
    Object.keys(connections).forEach((uuid) => {
        const connection = connections[uuid];
        connection.send(message);
    });
};

// SEND TO SPECIFIC
const send = (from: string, to: string, message: string) => {
    const connection = connections[to];
    if (connection) {
        connection.send(`${members[from]}: ${message}`);
    } else {
        console.log(`No connection found for UUID ${to}`);
    }
};

// WEBSOCKET SERVER
const wss = new WebSocketServer({ port: PORT }, () => {
    console.log("Server running on port:", PORT);
});

// HANDLE NEW CONNECTIONS
wss.on("connection", (connection: WebSocket, req: IncomingMessage) => {
    // GENERATE A UNIQUE IDENTIFIER (UUID) FOR THE CONNECTION
    const uuid = uuidv4();

    // EXTRACT THE USERNAME AND 'TO' PARAMETER FROM THE QUERY PARAMETERS IN THE REQUEST URL
    const { username, all, to } = url.parse(req.url || '', true).query;

    // STORE THE CONNECTION AND ITS ASSOCIATED USERNAME
    connections[uuid] = connection;
    members[uuid] = username;
    console.log('members', members);

    // SEND CONNECTION DETAILS TO THE CLIENT
    const connectionDetails: ConnectionDetails = { username, id: uuid };
    connection.send(JSON.stringify(connectionDetails));

    // HANDLE INCOMING MESSAGES
    connection.on("message", (data: Buffer) => {
        const message = data.toString();

        if (all) {
            broadcast(message)
        } else if (to) {
            send(uuid, to as string, message);
        } else {
            console.log(`${username}: ${message}`);
        }
    });

    // HANDLE CONNECTION CLOSE
    connection.on("close", () => {
        console.log(`Connection closed for ID : ${uuid}`);

        // REMOVE THE CONNECTION AND MEMBER
        delete connections[uuid];
        delete members[uuid];
    });
});
