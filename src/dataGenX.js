let fs = require("fs");
function getNutrients() {

  // Help scaling for making it full width need to figure out what exact values are the best
  var w = 2.5;
  var h = 7.5;

  fs.readFile('./nutrients.json', (err, vals) => {
    var values = [];
    if (err) throw err;
    let data = JSON.parse(vals);
    var count = data.length * .25;
    var max = Object.values(data[0])
    max = max.slice(2, max.length);

    var filters = Array(max.lenght).fill(0);
    filters[0] = 1.0;

    for (var i = 0; i < count; i++) {
      var row = Object.values(data[i])
      var row = row.slice(2, row.length);

      for (var j = 0; j < row.length; j++) {
        if (row[j] !== null && row[j] !== undefined) {
          max[j] = Math.max(row[j], max[j]);
        }

      }
    }
    console.log("max", max);
    for (var i = 0; i < count; i++) {
      var row = Object.values(data[i])
      var row = row.slice(2, row.length);
      var j = -1 * (max.length/2) ;
      var index = 0;
      var valid = true;
  
      row.forEach((val) =>
      {
        if (filters[index] < val)
        {
          valid = false;
        }
        index++;
      })
      index = 0;

      if (valid)
      {

      
      row.forEach((val) => {
        var row = []
        values.push((j / (max.length)) * w);
        var new_val = val / max[index];
        values.push(new_val * h);
        j++;
        index++;
      })
      values.push(undefined);
      values.push(undefined);
    }
    }
    writeData(values);
  });

}
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

function writeData(data) {
  let wstream = fs.createWriteStream("../dist/xData.txt");

  let buffer = new Buffer.alloc(data.length * 4);

  for (let i = 0; i < data.length; i++) {
    buffer.writeFloatLE(data[i], i * 4);
  }

  wstream.write(buffer);
  wstream.end();
}

getNutrients();

