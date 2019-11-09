const IPCManager = require('./IPCManager.js')
const Script = require('./mayaPlugin.js')
const Process = require('process')
const {spawnSync,exec} = require("child_process")
const fs = require('fs')
const {Registry} = require('rage-edit')

// ipc id [setName]_[moduleName]
const ID = 'maya_test_dividor'

var feedBack = {}
var minFrame = 5
var ipcManager = new IPCManager()
ipcManager.createServer({
    id:ID
})

ipcManager.addServerListenner('feedback',(data,socket) => {
    if(data != null){
        delete feedBack[data]
    }else{
        console.error('Empty feedback !!!')
    }
})


setInterval(() => {
    var keys = Object.keys(feedBack)
    keys.forEach(elem => {
        ipcManager.serverEmit('request',feedBack[elem])
    })
}, 30000);

/**************************** start of custom code  ******************************/

var appDataPath = Process.env['COT_DATA_PATH']+'/tmp' // to store .cot files
if(!fs.existsSync(appDataPath)){
    fs.mkdirSync(appDataPath)
}

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


function findModulePathDarwin(callback){
    var path = '/Users/Shared/Autodesk/modules/maya'
    var versions = ['2014','2015','2016','2017','2018','2019','2020']
    versions.forEach((elemen) => {
        if(fs.existsSync(path+'/'+elemen)){
            callback(path+'/'+elemen)
        }
    })
}

function findMayaEnvPath(prefix,callback){
  
    var versions = ['2014','2015','2016','2017','2018','2019','2020']
    for(var i=0;i<versions.length;i++){
        if(fs.existsSync(prefix+'/'+versions[i])){
            callback(prefix+'/'+versions[i])
        }
    }

}

function installDarwin(){

    //check env
    var envBuf = fs.readFileSync(process.env['HOME']+'/.bash_profile')
    envBuf - envBuf.toString()


    if(envBuf.includes('COT_ACTIVE')){
        console.log('COT_ACTIVE not empty, set it to YES')
        process.env['COT_ACTIVE'] = 'YES'
    }else{
        exec('echo \"\nexport COT_ACTIVE=YES\"  >> ~/.bash_profile')
       
        var mayaEnvPath = process.env['HOME']+'/Library/Preferences/Autodesk/maya'
        //+activeVersion[activeVersion.length-1]+'/Maya.env'
        findMayaEnvPath(mayaEnvPath,(path) => {
            var echoValue = 'echo \"COT_DATA_PATH = \"'+process.env['COT_DATA_PATH']+'\"\"  >> '+path+'/Maya.env'
            exec(echoValue)
        })

        // main scripts path
        if(!fs.existsSync(appDataPath+'/scripts')){
            fs.mkdirSync(appDataPath+'/scripts')
        }

        // module path
        var modulePath = appDataPath+'/scripts/CoTForMaya'
        if(!fs.existsSync(modulePath+'/scripts')){
            fs.mkdirSync(modulePath+'/scripts',{recursive:true})
        }

        var script = new Script(modulePath+'/scripts')
        findModulePathDarwin((result) => {
            if(result != null){
                var buf = '+ CoTForMaya 0.1 '+modulePath
                fs.writeFileSync(result+'/CoTForMaya.module',buf)
            }
        })

        
    }
    

    


}

function installWin32(){
    console.log('installation for win32')
     var result = spawnSync('setx', ['-m', 'COT_ACTIVE', 'YES'])
         // STDOUT
        var stdOut = result.stdout.toString();
       
        // STDERR
        var stdErr =  result.stderr.toString();

        if(stdErr === '') {
            console.log('Successfully set environment variable')
        } else {
            console.error(`ERROR: ${stderr}`)
            return false
        }

        //do totally install

        // main scripts path
        if(!fs.existsSync(appDataPath+'/scripts')){
            fs.mkdirSync(appDataPath+'/scripts')
        }

        // module path
        var modulePath = appDataPath+'/scripts/CoTForMaya'
        if(!fs.existsSync(modulePath+'/scripts')){
            fs.mkdirSync(modulePath+'/scripts',{recursive:true})
        }

        var script = new Script(modulePath+'/scripts')

        // write
        findRootPath((result) => {
            if(result != null){
                var moduleConfPath = result+'\\modules'
                var fixed = modulePath.replace(/\//g,'\\')
                var buf = '+ CoTForMaya 0.1 '+fixed
                console.log('origin '+modulePath)
                console.log('fixed '+fixed)
                fs.writeFileSync(moduleConfPath+'/CoTForMaya.module',buf)
            }
        })   
}





function install(){
   
    if(Process.env["COT_ACTIVE"] == null || Process.env["COT_ACTIVE"] != 'YES'){
       console.log(Process.arch)
       if(Process.platform == 'win32'){
            installWin32()
       }else if(Process.platform == 'darwin'){
           console.log('install to darwin')
            installDarwin()
       }else{

       }
    }else{
        console.log('scripts already installed')
        console.log(Process.env)
    }
   
    
}

function readConfig(confPath){
    var buffer = fs.readFileSync(confPath)
    if(buffer != null && buffer.length > 10){
        buffer = JSON.parse(buffer)
    }else{
        buffer = null
    }
    fs.unlink(confPath,(err) => {
        if(err){
            console.error('Can not read configure file '+confPath)
        }
    })
    return buffer
}


function divid(conf){

    if(conf == null){
        console.error('empty work info')
        return
    }
    var workNumber = (conf.endFrame - conf.startFrame + 1)/minFrame
    workNumber = Math.ceil(workNumber)

    var x = Math.sqrt(workNumber)
    x = Math.ceil(x)
    y = x

    var input = {};
    input.workName = conf.name
    input.protected = {};

    input.protected.inputFiles = [];
    var file1 = {};
    var fileNameTmp = conf.path.split('/')
    file1.fileName = fileNameTmp[fileNameTmp.length-1]
    file1.url = conf.path
    file1.size = 1027;
    file1.md5 = 'unknow4';
    file1.type = 'public'
    input.protected.inputFiles.push(file1)

    input.unprotected = {}
    input.unprotected.appSet = 'maya_test'
    input.unprotected.target = ['darwin-x86_64','linux-amd64','linux-x86_64','windows-x86_64']
    input.unprotected.block = {}

    input.unprotected.block.number = workNumber;
    input.unprotected.block.indexs = x+'_'+y
    input.unprotected.info = {};
    var startTime = new Date();
    startTime = startTime.valueOf();
    input.unprotected.info.startTime = startTime;
    input.unprotected.info.progress = 0;

    for(var i=0; i<x; i++){
        for(var j=0; j<y; j++){
            if((i+1)*(j+1) > workNumber){
                i=x
                j=y
            }else{
                var globalIndex = i+j*x
                input.unprotected.blockName = input.workName+'_'+i+'_'+j
                input.unprotected.block.index = i+'_'+j
                var start = (globalIndex*minFrame)
                var end = ((globalIndex+1)*minFrame)
                if(end > conf.endFrame){
                    end = conf.endFrame
                }
                input.protected.command = '[CMD] -r file -rd [OUTPUT_PATH] -im result.png -s '+start+' -e '+end+' [INPUT_PATH]'
                ipcManager.serverEmit('request',JSON.stringify(input))
                feedBack[input.unprotected.blockName] = input
            }
        }
    }  
}


function mainLooper(){
    setInterval(() => {
        if(fs.existsSync(appDataPath)){
            fs.readdir(appDataPath, function(err, items) {
               if(err){
                   console.error(err)
               }else{
                   items.forEach((element) => {
                    var check = element.substr(element.length-4,4)
                    if(check != '.cot'){
                        return
                    }else{
                        var config = readConfig(appDataPath+'/'+element)
                        divid(config)
                    }
                   })

               }
            });
        }else{

        }
        
    }, 3000);
}


install()
mainLooper()


/**************************** end of custom code    ******************************/

// recive validate request from core
ipcManager.serve()