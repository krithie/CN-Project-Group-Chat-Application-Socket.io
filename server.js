const express = require('express'); 
const http = require('http');  

const PORT = 5000; 

const app = express()  
const server = http.createServer(app);  //create http server and pass the defined application

app.use(express.static("public")); 

app.get('/',(req, res) => {        //define main route, two objects given by express, request & response
    res.sendFile(__dirname + "/public/index.html");  
});

const io = require("socket.io")(server);  //define io and connect app to socket.io

let connectedPeers = []; //for bigger applications connect mongodb etc here


io.on("connection", (socket) => {
    console.log(socket.id);

    socket.on('group-chat-message', data =>{
        console.log('group message');
        console.log(data);

        io.emit('group-chat-message', data);

    });

    socket.on('register-new-user', (userData) => {
        const { username, roomId } = userData;
        const newPeer = {
            username,
            socketId : socket.id,
            roomId,
        }

        //join socket.io room
        socket.join(roomId);

        connectedPeers = [...connectedPeers, newPeer];
        broadcastConnectedPeers();

    });


    socket.on('direct-message', (data) =>{
       const { receiverSocketId } = data;

       const connectedPeer = connectedPeers.find(
           (peer) => peer.socketId === receiverSocketId
           );

           if (connectedPeer) {
               const authorData = {
                   ...data, 
                   isAuthor: true
               }

               //emit event with message to ourself
               socket.emit('direct-message', authorData);

               //emit an event to receiver of the message
               io.to(receiverSocketId).emit('direct-message', data);
           }
    }); 

    socket.on('room-message', (data) => {
        const { roomId } = data;
        io.to(roomId).emit('room-message', data);
    });

    socket.on("disconnect", ()=>{
        connectedPeers = connectedPeers.filter((peer) => peer.socketId !== socket.id);
        broadcastConnectedPeers();

        const data = {
            socketIdOfDisconnectedPeer: socket.id
        };


        io.emit('peer-disconnected', data);
    });
});

const broadcastConnectedPeers = () => {
    const data = {
        connectedPeers
    };

    io.emit('active-peers', data);
};

server.listen(PORT, () => {  //server listening to the defined port and inform the user
    console.log(`Server listening on ${PORT}`);
});