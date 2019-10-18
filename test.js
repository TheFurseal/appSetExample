


var confPath = '12345.cot'
var check = confPath.substr(confPath.length-4,4)
if(check != '.cot'){
	console.log('not configure')
	console.log(check)
}else{
	console.log('is configure')
	console.log(check)
}


