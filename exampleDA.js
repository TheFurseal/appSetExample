const IPCManager = require('./IPCManager.js')
const fs = require('fs')
const process = require('process')
const {Registry} = require('rage-edit')
var Spawn = require('child_process').spawn
const unzip = require('unzip')
const Child = require('child_process')
var recursive = require("recursive-readdir")
var archiver = require('archiver')



const appSetName = 'mayaRender'
const ID = appSetName+'_dapp'

// node-ipc may lose message, use this to make sure message has recived by client
var feedback = {}

console.log('version: 0.0.4')

var ipcManager = new IPCManager()

async function findRootPath(callback){
    var key = 'HKLM\\SOFTWARE\\Autodesk\\Maya'
    var versions = ['2021','2020','2019','2018','2017','2016']
    for(var i=0;i<versions.length;i++){
        var tmpKey = key+'\\'+versions[i]+'\\Setup/InstallPath'
        var tmpRes = await Registry.get(tmpKey,'MAYA_INSTALL_LOCATION')
        if(tmpRes!=null){
            callback(tmpRes)
            break
        }
    }
}

var rootPath 
var binPath
var tmpPath = process.env['APPDATA']+'/CoTNetwork/resultTmp'
tmpPath = tmpPath.replace(/\//g,'\\')
var outPutPath

function fixFilePath(path){
  
    return  path.replace(/\\/g,'/')

}



function resetIO(data,callback){
    var cmdParam = data.protected.command
    cmdParam = cmdParam.split(' ')
    var result = ''
    var noFormat =  data.protected.inputFiles[0].path.split('.')
    noFormat = fixFilePath(noFormat[0])
    data.protected.inputFiles[0].path = fixFilePath(data.protected.inputFiles[0].path)

    console.log('start unzip input file '+data.protected.inputFiles[0].path)
    //var stream = fs.createReadStream(data.protected.inputFiles[0].path).pipe(unzip.Extract({ path: noFormat }));
    var readStream = fs.createReadStream(data.protected.inputFiles[0].path)
    readStream.pipe(unzip.Extract({path:noFormat}))

    readStream.on('close',() => {
        console.log('end unzip input file to '+noFormat)
        recursive(noFormat, function (err, files) {
            if(err){
                console.error(err)
            }else{
                files.forEach(file => {
                    var format = file.substring(file.length-3)
                    if(format == '.mb'){

                        for(var i=0; i<cmdParam.length; i++){
                            var tmp = cmdParam[i]
                            if(tmp == '[CMD]'){
                                cmdParam[i] = binPath
                            }else if(tmp == '[INPUT_PATH]'){
                            
                                cmdParam[i] = file
                            }else if(tmp == '[OUTPUT_PATH]'){
                                cmdParam[i] = tmpPath+'/'+data.unprotected.blockName
                                outPutPath =  tmpPath+'/'+data.unprotected.blockName
                                outPutPath = fixFilePath(outPutPath)
                                if(!fs.existsSync(outPutPath)){
                                    fs.mkdirSync(outPutPath,{
                                        recursive:true
                                    })
                                }
                            }else{
                                
                            }
                            if(result == ''){
                                result = cmdParam[i]
                            }else{
                                result = result + ' ' +cmdParam[i]
                            }
                        }
                    
                        result = fixFilePath(result)
                    
                        data.protected.command = result
                        console.log('reset result '+result)

                        
                        if(callback != null){
                            callback(data)
                        }else{
                            console.error('callback is empty!!!!!')
                        }
                    }
                })
            }
            
        });
    })
    readStream.on('error',(err) => {
        console.error(err)
    })
 
}

function getPIDByName(name,callback){
       
        if(name == null){
            console.error('Empty process name')
            callback(-1)
        }
        name = name.toLowerCase()
        var cmd=process.platform=='win32'?'tasklist':'ps -A';
        var exec = Child.exec;
        
        exec(cmd, function(err, stdout, stderr) {
            if(err){ 
                console.error(err)
                return 
            }

            var lines = stdout.split('\n')

            for(var i=0;i<lines.length;i++){
                var line = lines[i]
                var p
                if(process.platform == 'win32'){
                    p=line.trim().split(/\s+/),nameStr=p[0],pidStr=p[1]
                    if(nameStr.toLowerCase().indexOf(name)>=0 && parseInt(pidStr)){
                       
                        callback(parseInt(pidStr))
                        return;
                    }else{
                        //callback(-1)
                    }
                }else if(process.platform = 'darwin'){
                    p=line.trim().split(/\s+/),pidStr=p[0],nameStr=p[p.length-1]
                    
                    if(nameStr.toLowerCase().indexOf(name)>=0 && parseInt(pidStr)){
                       
                        callback(parseInt(pidStr))
                        return;
                    }else{
                        //callback(-1)
                    }
                }
            }
            console.log('not got pid')
            callback(-1)

            
        });
    
    }

function fixArgumentsSpace(input,output,index,tmpBuff){
    console.log('fixArgumentsSpace '+index)
    if(output == null){
        output = []
    }
    if(tmpBuff == null){
        tmpBuff = ''
    }

    if(input[index].indexOf('-') == 0 || (index > 1 && input[index-1].indexOf('-') == 0)){
        if(tmpBuff != ''){
            output.push(tmpBuff)
            tmpBuff = ''
        }
        output.push(input[index])
        
    }else{
        if(tmpBuff != ''){
            tmpBuff = tmpBuff+' '+input[index]
        }else{
            tmpBuff = input[index]
        }
        
    }

    index++
    
    if(index < input.length){
        fixArgumentsSpace(input,output,index,tmpBuff)
    }else{
        output.push(tmpBuff)
        console.log('1',output)
        return
    }
}



function run(data){
    console.log(data)
    if(typeof(data) == 'string'){
        data = JSON.parse(data)
    }
    
    resetIO(data,(result) => {
        var sp = result.protected.command
        sp = sp.split('.exe')
        var options = sp[1]
        
        options = options.split(' ')
        var output = []
        console.log('befor',options)
        fixArgumentsSpace(options,output,0)
        console.log('fixed',output)
        var cp = Spawn(sp[0]+'.exe',output)
        console.log('launch maya render '+cp.pid)
        cp.stdout.on('data',function(data){
            console.log(data.toString())
        })
         cp.stderr.on('data',function(data){
            console.log(data.toString())
        })
        setTimeout(() => {
        	var locker = false
             var handle = setInterval(() => {
             	if(locker){
             		return
             	}
             	locker = true
                getPIDByName('Render.exe',(pid) => {
                    if(pid < 0){
                        clearInterval(handle)
                        constructResult(result)
                    }
                    locker = false
                })
            },1000)
        },10000)
       
    })
   
    
}

function constructResult(data){
    //packing file
    var outPath = tmpPath+'/'+data.unprotected.blockName

    var output = fs.createWriteStream(outPath+'.zip')
    var archive = archiver('zip');
    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        var outputFile = {}
        outputFile.fileName = data.unprotected.blockName+'.zip'
        outputFile.path = outPath+'.zip'
        data.protected.outputFiles = []
        data.protected.outputFiles.push(outputFile)
        feedback[data.unprotected.blockName] = data
        //send result
        ipcManager.serverEmit('result',JSON.stringify(data))
        
    })

    archive.on('error', function(err){
        throw err;
    })

    archive.pipe(output);
    archive.directory(outPath)
    archive.finalize();


}

findRootPath((value) => {
    if(value != null){
        rootPath = value
        binPath = value+'bin\\Render.exe'
        console.log('found bin path '+binPath)
        
    }else{
        console.log('can not found may root path')
        throw new Error('can not found may root path')
    }
})

ipcManager.createServer({
    id:ID
})

ipcManager.addServerListenner('request',(data,socket) => {
    console.log('request come')
    run(data)
})

ipcManager.addServerListenner('feedback',(data,socket) => {
    if(data != null){
        console.log('feedback '+data)
        delete feedback[data]
    }else{
        console.error('Empty feedback')
    }
})

ipcManager.serve()

setInterval(() => {
    var keys = Object.keys(feedback)
    keys.forEach(ele => {
        console.log('resend '+ele)
        console.log(JSON.stringify(feedback[ele]))
        ipcManager.serverEmit('result',JSON.stringify(feedback[ele]))
    })
    
}, 30000);



