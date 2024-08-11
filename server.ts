import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import url from 'url';
import { IncomingMessage } from 'http';

const PORT = 8000;

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

// WEBSOCKET SERVER
const wss = new WebSocketServer({ port: PORT }, () => {
    console.log("Server running on port:", PORT);
});

// HANDLE NEW CONNECTIONS
wss.on("connection", (connection: WebSocket, req: IncomingMessage) => {
    // GENERATE A UNIQUE IDENTIFIER (UUID) FOR THE CONNECTION
    const uuid = uuidv4();

    // EXTRACT THE USERNAME FROM THE QUERY PARAMETERS IN THE REQUEST URL
    const { username } = url.parse(req.url || '', true).query;

    // STORE THE CONNECTION AND ITS ASSOCIATED USERNAME
    connections[uuid] = connection;
    members[uuid] = username;
    console.log('members', members)

    // SEND CONNECTION DETAILS
    const connectionDetails: ConnectionDetails = { username, id: uuid };
    connection.send(JSON.stringify(connectionDetails));

    // HANDLE INCOMING MESSAGES
    connection.on("message", (data: Buffer) => {
        console.log(`${username} :`, data.toString());
        connection.send("Server response");
    });

    // HANDLE CONNECTION CLOSE
    connection.on("close", () => {
        console.log(`Connection closed: UUID ${uuid}`);

        // REMOVE THE CONNECTION AND MEMBER
        delete connections[uuid];
        delete members[uuid];
    });
});