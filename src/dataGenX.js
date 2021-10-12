function getSinPoints(stepDensity, total) {
  let points = [];
  let start = -Math.PI;
  let end = Math.PI;

  let step = (2 * Math.PI) / stepDensity;
  end += 0.0001;

  for (let count = 1; count <= total; count++) {
    for (let i = start; i <= end; i += step) {
      points.push(i / Math.PI);
      points.push(Math.floor(Math.random() * 6));
      console.log(Math.floor(Math.random() * 5));
    }
    points.push(undefined);
    points.push(undefined);
  }
  return points;
}

let fs = require("fs");
let wstream = fs.createWriteStream("../dist/xData.txt");

let data = getSinPoints(10, 10);

let buffer = new Buffer.alloc(data.length * 4);

for (let i = 0; i < data.length; i++) {
  buffer.writeFloatLE(data[i], i * 4);
}

wstream.write(buffer);
wstream.end();
