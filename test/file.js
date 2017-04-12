var fs = require('fs');
 
fs.readFile('./data/dataFile.txt', 'utf8', function(err, contents) {
    if(err)
     console.log(err)
    else
     console.log(contents);
});
 
console.log('after calling readFile');