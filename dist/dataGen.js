var filters = [0,0,0,0,0,0,0,0,0,0,0,0,0,0];
console.log("dataGenX.js");
function createFilter(name,max,index)
{
  var filters_div = document.getElementById("filters");
    var filter = document.createElement("input");
    filter.type=("range");
    filter.id=name;
    filter.name = name;
    filter.min = 0;
    filter.value = 0;
    filter.max = max;
    filter.onchange = function(){
        filters[index] = this.value;
        console.log(filters);
    }

    filters_div.appendChild(filter);

    var label = document.createElement("label");
    label.for = name;
    label.innerHTML=name;

    
    filters_div.appendChild(label);

    
}
function createForms()
{

  var names = [
  'protein (g)',      'calcium (g)',
  'sodium (g)',       'fiber (g)',
  'vitaminc (g)',     'potassium (g)',
  'carbohydrate (g)', 'sugars (g)',
  'fat (g)',          'water (g)',
  'calories',         'saturated (g)',
  'monounsat (g)',    'polyunsat (g)']
  var max = [
    82.4,   2.24, 38.758, 53.1, 0.5667,   4.74,89,  74.46,    100, 98.69,    902,   95.6, 83.689, 74.623];
for (var i = 0; i < max.length; i++)
{
    createFilter(names[i],max[i],i);
}
} 
// function getNutrients() {

//   // Help scaling for making it full width need to figure out what exact values are the best
//   var w = 2.5;
//   var h = 7.5;

//   fetch('./nutrients.json')
//    .then(response => {
//        if (!response.ok) {
//            throw new Error("HTTP error " + response.status);
//        }
//        return response.json();
//    })
//    .then(vals => {
//     var values = [];
//     let data = JSON.parse(JSON.stringify(vals))
//     var count = data.length * .25;
//     var max = Object.values(data[0])
//     max = max.slice(2, max.length);

//     for (var i = 0; i < count; i++) {
//       var row = Object.values(data[i])
//       var row = row.slice(2, row.length);

//       for (var j = 0; j < row.length; j++) {
//         if (row[j] !== null && row[j] !== undefined) {
//           max[j] = Math.max(row[j], max[j]);
//         }

//       }
//     }
//     console.log("max", max);
//     for (var i = 0; i < count; i++) {
//       var row = Object.values(data[i])
//       var row = row.slice(2, row.length);
//       var j = -1 * (max.length/2) ;
//       var index = 0;
//       var valid = true;
  
//       row.forEach((val) =>
//       {
//         if (filters[index] < val)
//         {
//           valid = false;
//         }
//         index++;
//       })
//       index = 0;

//       if (valid)
//       {

      
//       row.forEach((val) => {
//         var row = []
//         values.push((j / (max.length)) * w);
//         var new_val = val / max[index];
//         values.push(new_val * h);
//         j++;
//         index++;
//       })
//       values.push(undefined);
//       values.push(undefined);
//     }
//     }
//     writeData(values);
  
//    })
//    .catch(function (e) {
//     console.log("problem",e)
//  })
 
    

// }
// function getSinPoints(stepDensity, total) {
//   let points = [];
//   let start = -Math.PI;
//   let end = Math.PI;

//   let step = (2 * Math.PI) / stepDensity;
//   end += 0.0001;

//   for (let count = 1; count <= total; count++) {
//     for (let i = start; i <= end; i += step) {
//       points.push(i / Math.PI);
//       points.push(Math.floor(Math.random() * 6));
//       console.log(Math.floor(Math.random() * 5));
//     }
//     points.push(undefined);
//     points.push(undefined);
//   }
//   return points;
// }


window.onload = function()
{
    createForms();
}

