const Process = require('process')
const fs = require('fs')
var archiver = require('archiver')
var unzip = require('unzip-stream')

var path = '/Users/john/Library/Application Support/CoTNetwork/resultTmp/1569221262562_4_3.zip'
var to = '/Users/john/Library/Application Support/CoTNetwork/resultTmp/1569221262562_4_3_test'


console.log('start')
var stream = fs.createReadStream(path).pipe(unzip.Extract({ path: to }));

stream.on('finish',() => {
	console.log('finish')
})

console.log('end')


