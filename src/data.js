var keys = Object.keys(data[0]);
  console.log(keys);

  var data2:Array<any>  = Object.values(data[0])
  var dataCleaned = new Float32Array(data2);
  console.log(dataCleaned);

  for (var i = 0; i < dataCleaned.length; i++)
  {
    if (isNaN(dataCleaned[i]))
    {
      dataCleaned[i] = 0.0;
    }
  }