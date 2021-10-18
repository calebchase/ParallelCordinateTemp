let fs = require("fs");
export function writeData(data) {
    let wstream = fs.createWriteStream("../dist/xData.txt");
  
    let buffer = new Buffer.alloc(data.length * 4);
  
    for (let i = 0; i < data.length; i++) {
      buffer.writeFloatLE(data[i], i * 4);
    }
  
    wstream.write(buffer);
    wstream.end();
  }
  