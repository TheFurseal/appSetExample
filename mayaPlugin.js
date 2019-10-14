const fs = require('fs')
const plugStr = "import os\n\
import time\n\
import maya.cmds as cmds\n\
\n\
def writeSignal(scenePath):\n\
    if len(scenePath) < 1 :\n\
        cmds.confirmDialog(t=\"Error\",m=\"Can not get scene archive\",button=[\"Yes\"])\n\
        return\n\
        \n\
    fileName = os.environ[\"COT_DATA_PATH\"]\n\
    tNow = int(round(time.time()*1000))\n\
    fileName = fileName+\"/tmp/\"+str(tNow)+\".cot\"\n\
    buffer = '{'\n\
    buffer = buffer + '\t\"name\": \"' + str(tNow)+'\",'\n\
    buffer = buffer + '\t\"path\": \"' + scenePath+'\",'\n\
    buffer = buffer + '\t\"startFrame\": ' + str(cmds.getAttr(\"defaultRenderGlobals.startFrame\")) + ','\n\
    buffer = buffer + '\t\"endFrame\": ' + str(cmds.getAttr(\"defaultRenderGlobals.endFrame\")) + ','\n\
    buffer = buffer + '\t\"resX\": ' + str(cmds.getAttr(\"defaultResolution.width\")) + ','\n\
    buffer = buffer + '\t\"resY\": ' + str(cmds.getAttr(\"defaultResolution.height\"))\n\
    buffer = buffer +'}'\n\
    tmp = open(fileName,\"wb\")\n\
    tmp.write(buffer)\n\
    tmp.close()\n\
    \n\
    \n\
def checkState():\n\
	fileCheckState = cmds.file(q=True,modified=True)\n\
	if fileCheckState:\n\
	    confirm = cmds.confirmDialog(t=\"Confirm\",m=\"Scene not saved, save it now?\",button=[\"Yes\",\"No\"])\n\
	    if confirm == \"Yes\":\n\
	        cmds.SaveScene()\n\
	        return True\n\
	    else:\n\
	        return False\n\
	   \n\
	else:\
	    return True\n\
	    \n\
def packaging(a):\n\
    if checkState():\n\
        files = cmds.file(query=1, list=1, withoutCopyNumber=1)\n\
        if len(files) == 0:\n\
            cmds.confirmDialog(t=\"Error\",m=\"No scene file found!\",button=[\"Yes\"])\n\
            return\n\
            \n\
        zipFileName = (files[0])+\".zip\"\n\
        cmds.ArchiveScene()\n\
        writeSignal(zipFileName)\n\
        cmds.confirmDialog(t=\"Successed\",m=\"Packaging successed\",button=[\"Yes\"])\n\
    else:\n\
        cmds.confirmDialog(t=\"Error\",m=\"Packaging failed\",button=[\"Yes\",\"No\"])\n\
\n\
def initializeMayaDividor():\n\
    if cmds.control(\"CoTNetwork\",exists=True):\n\
        cmds.deleteUI(\"CoTNetwork\",menu=True)\n\
    else:\n\
        pass\n\
\n\
    cmds.setParent(\"MayaWindow\")\n\
    cmds.menu(\"CoTNetwork\", l=u\"CoTNetwork\", to=True)\n\
    cmds.menuItem(l=u\"Packaging\",c=packaging)\n\
    cmds.setParent(\"..\")\n"


var userSetupStr = '\n\
import pymel.core as pm\n\
import cot as cot\n\
\n\
def run():\n\
	cot.initializeMayaDividor()\n\
\n\
\n\
pm.general.evalDeferred("run()")'


class Script{
    constructor(targetPath){
        fs.writeFile(targetPath+'/cot.py',plugStr,(err) => {
            if(err){
                console.error(err)
            }
        })

        fs.writeFile(targetPath+'/userSetup.py',userSetupStr,(err) => {
            if(err){
                console.error(err)
            }
        })
    }
}

module.exports =  Script