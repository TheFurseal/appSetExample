const IPC = require('node-ipc')
const debug = require('debug')('common:IPCManager')

class IPCManager{
    constructor(){
        this.clientConnected = false
        this.serverConnected = false
        this.serverHandleFuncs = []
        this.clientHandleFuncs = []
    }

    createServer({
        id:id,
        silent:silent,
        retry:retry
    }){
        if(id == null){
            console.error('Empty id for server')
            return
        }

        IPC.config.id = id

        if(silent != null){
            IPC.config.silent = silent
        }else{
            IPC.config.silent = true
        }
        if(retry != null){
            IPC.config.retry = retry
        }else{
            IPC.config.retry = 500
        }


    }

    serve(){
        var parent = this
        IPC.serve(
            function(){
                IPC.server.on("connect",function(socket){
                    parent.clientSockTmp = socket;
                    parent.clientConnected = true
        
                })
                IPC.server.on(
                    'socket.disconnected',
                    function(socket,destroyedSocketID){
                        debug('client disconnected')
                        parent.clientConnected = false

                    }
                )
                
                parent.serverHandleFuncs.forEach((element) => {
                    
                    IPC.server.on(element.event,(data,socket) => {
                       
                        //debug('server confirm message')
                        element.func(data,socket)
                    })
                })
            }
        )

        IPC.server.start()
    }

    connect(id){
        if(id == null){
            console.error('Empty id to connecting')
        }
        var parent = this
        var serverID = id
        this.serverID = id
        IPC.connectTo(
            serverID,
            function(){
                IPC.of[serverID].on(
                    'connect',
                    function(){
                        parent.serverConnected = true
                        

                    }
                )
                IPC.of[serverID].on(
                    'disconnect',
                    function(){
                        parent.serverConnected = false
                        console.log('disconnected to server '+serverID)
                    }
                )
                
                parent.clientHandleFuncs.forEach((element) => {
                    
                    IPC.of[serverID].on(element.event,(data,socket) => {
                        
                        //debug('client confirm message')
                        element.func(data,socket)
                    })

                })
            }
        )
    }

    createClient({
        silent:silent,
        retry:retry
    }){
        
        if(silent != null){
            IPC.config.silent = silent
        }else{
            IPC.config.silent = true
        }
        if(retry != null){
            IPC.config.retry = retry
        }else{
            IPC.config.retry = 500
        }
    }

    addServerListenner(event,callback){
        if(event == null || callback == null){
            console.error('Empty event or callback')
        }
        var tmp = {}
        tmp.event = event
        tmp.func = callback
        this.serverHandleFuncs.push(tmp)
        debug('add '+event+' handler to server')
    }

    addClientListenner(event,callback){
        if(event == null || callback == null){
            console.error('Empty event or callback')
        }
        var tmp = {}
        tmp.event = event
        tmp.func = callback
        this.clientHandleFuncs.push(tmp)
        debug('add '+event+' handler to client')
    }

    serverEmit(event,data,sock){
        if(sock == null){
            sock = this.clientSockTmp
        }
       
        IPC.server.emit(
            sock,
            event,
            data
        )

    }

    clientEmit(event,data,sock){
        if(sock == null){
            sock = this.serverID
        }
      
        IPC.of[sock].emit(
            event,
            data
        )
    }

    serverDisconnect(){
        IPC.server.stop()
    }

    clientDisconnect(){
        IPC.disconnect()
    }

   
}

module.exports = IPCManager