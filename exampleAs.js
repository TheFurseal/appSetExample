const IPCManager = require('./IPCManager.js')
const {ffmpeg} = require('ffmpeg-stream')
const fs = require('fs')
const unzip = require('unzip-stream')
var recursive = require("recursive-readdir")


console.log('version: 0.0.4')

const appSetName = 'mayaRender'
const ID = appSetName+'_assimilator'

var ipcManager = new IPCManager() 


async function frameConvertor(frames,outPath,callback){
    if(frames.length < 1){
        console.error('Empty frames !!!!!')
        return
    }

    if(outPath == null){
        outPath = ""
    }

    const conv =  ffmpeg() // create converter
    const input = conv.input({f: 'image2pipe', r: 30}) // create input writable stream
    conv.output(outPath, {vcodec: 'libx264', pix_fmt: 'yuv420p'}) // output to file

    // for every frame create a function that returns a promise
    frames.map(filename => () =>
    new Promise((resolve, reject) =>
        fs.createReadStream(filename)
        .on("end", resolve)
        .on("error", reject)
        // pipe to converter, but don't end the input yet
        .pipe(
          input,
          { end: false },
        ),
    ),
  )
  // reduce into a single promise, run sequentially
  .reduce((prev, next) => prev.then(next), Promise.resolve())
  // end converter input
  .then(() => {
    input.end()
    callback(null,outPath)
  })

    conv.run()
    
}


function doAssimilate(data,callback){
    var frames = []
    var dirs = []
    var total = 0
    data.outputs.forEach((element) => {
        console.log('read '+element.path)
        var noFormat = element.path.split('.zi')
        noFormat = noFormat[0]
        dirs.push(noFormat)
        var readStream = fs.createReadStream(element.path)
        readStream.pipe(unzip.Extract({path:noFormat}))
        readStream.on('close',() => {
            recursive(noFormat, (err, files) => {
                if(err){
                    console.error(err)
                    console.error(noFormat)
                }else{
                    files.forEach( file => {
                        if(file.includes('.png')){
                            if(frames.indexOf(file) < 0){
                                frames.push(file)
                            }
                        }
                    })
                    total++
                }
            })
        })  
    })
   
    var handler2 = setInterval(() => {
        if(total == data.outputs.length){
            clearInterval(handler2)
            var sortstring = function (a, b){
                a = a.split('result.png')
                a = a[a.length-1]
                b = b.split('result.png')
                b = b[b.length-1]
                return a.localeCompare(b);
            }
            var savePath = data.workName+'.mp4'
            var appDataPath = data.outputs[0].path.split('/CoTNetwork')
            appDataPath = appDataPath[0]
            var savePath = appDataPath+'/CoTNetwork/outputs/'+data.workName+'.mp4'
            if(fs.existsSync(savePath)){
                fs.unlinkSync(savePath)
            }
            frameConvertor(frames.sort(sortstring),savePath,callback)
        }
        
    }, 1000);
   
}

// validation code
function run(data){
    if(data == null){
        return
    }
    console.log(data)
    if(typeof(data) == 'string'){
        data = JSON.parse(data)
    }

    var msg = {}
   
    if(data.totalBlock != null && data.outputs != null && data.totalBlock == data.outputs.length){
       doAssimilate(data,(err,resultPath) => {
            if(err == null){
                msg.result = 'YES'
                msg.outputFile = {}
                msg.outputFile.path = resultPath
                msg.workName = data.workName
                ipcManager.serverEmit('result',JSON.stringify(msg))
            }else{
                msg.result = 'NO'
                msg.error =  'assimilate failed for '+data.workName
                msg.workName = data.workName
                ipcManager.serverEmit('result',JSON.stringify(msg))
            }
            
       })
    }else{
        msg.result = 'NO'
        msg.error =  'total block '+data.totalBlock+' output len '+data.outputs.length
        msg.workName = data.workName
        ipcManager.serverEmit('result',JSON.stringify(msg))
    }
}


ipcManager.createServer({
    id:ID
})
ipcManager.addServerListenner('request',(data,socket) => {
    run(data)
})
ipcManager.serve()