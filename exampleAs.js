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
  .reduce((prev, next) => prev.then(next), Promise.resolve().catch(err => {console.log(err)}))
  // end converter input
  .then(() => {
    input.end()
    callback(null,outPath)
  }).catch(err => {
      console.error(err)
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
                    for(var i = 0; i< files.length; i++){
                        var file = files[i]
                        if(file.includes('.png')){
                            if(frames.indexOf(file) < 0){
                                frames.push(file)
                            }
                        }
                    }
                }
                if(++total == data.outputs.length){
                    var sortstring = function (a, b){
                        a = a.split('.')
                        a = a[a.length-2]
                        a = parseInt(a)
                        b = b.split('.')
                        b = b[b.length-2]
                        b = parseInt(b)
                        if(a > b ){
                            return 1
                        }else if(a < b){
                            return -1
                        }else{
                            return 0
                        }
                    }
                    var savePath = data.workName+'.mp4'
                    var appDataPath = data.outputs[0].path.split('/CoTNetwork')
                    appDataPath = appDataPath[0]
                    var savePath = appDataPath+'/CoTNetwork/outputs/'+data.workName+'.mp4'
                    if(fs.existsSync(savePath)){
                        fs.unlinkSync(savePath)
                    }
                    var tmp = frames.sort(sortstring)
                    var uniqueArr = tmp.filter((elem,pos) => {
                        return tmp.indexOf(elem) == pos
                    })
                   
                    frameConvertor(uniqueArr,savePath,callback).then(() => {
                        console.log('process done!')
                    }).catch((err) => {
                        console.error(err)
                    })
                }

            })
        })  
    })
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