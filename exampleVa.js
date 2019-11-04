const IPCManager = require('./IPCManager.js')


const ID = 'maya_win_validator'

var ipcManager = new IPCManager()
ipcManager.createServer({
    id:ID
})

/**************************** start of custom code  ******************************/

function constructPreview(data){
    
}

function doValidate(data){

    console.log(data)
    if(typeof(data) == 'string'){
        data = JSON.parse(data)
    }
    var msg = {}
    if(data.protected.outputFiles != null){
        msg.result = 'YES'
    }else{
        msg.result = 'NO'
    }
    msg.workInfo = data
    ipcManager.serverEmit('result',JSON.stringify(msg))

}

/**************************** end of custom code    ******************************/

// recive validate request from core
ipcManager.addServerListenner('request',(data,socket) => {
    doValidate(data)
})

ipcManager.serve()




