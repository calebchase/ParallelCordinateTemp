function radToDeg(rad: number) {
  return rad * (180 / Math.PI);
}

function getSinPoints() {
  let points = [];
  let start = -1;
  let end = 1;
  let step = .1;
  
  for(let i = start; i <= end; i += step) {
    points.push(i);
    points.push(Math.sin(radToDeg(i)));
  }
  return points;
}

