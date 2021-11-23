[[block]] struct Matrix {
      size : vec2<f32>;
      numbers: array<f32>;
    };

    [[group(0), binding(0)]] var<storage, read> dataMatrix : Matrix;
    [[group(0), binding(1)]] var<storage, read> filterMatrix : Matrix;
    [[group(0), binding(2)]] var<storage, write> resultMatrix : Matrix;
   
    
    [[stage(compute), workgroup_size(8, 8)]]
    fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
      // Guard against out-of-bounds work group sizes
      if (global_id.x >= u32(dataMatrix.size.x) || global_id.y >= u32(filterMatrix.size.y)) {
        return;
      }

      resultMatrix.size = vec2<f32>(dataMatrix.size.x * dataMatrix.size.y, f32(2.0));
      var row = 0.0;
  

      for (var i = 0u; i < u32(dataMatrix.size.x / filterMatrix.size.x); i = i + 1u)
      {
        var valid = 0;
       
        for (var j = 0u; j < u32(filterMatrix.size.x - 1.0); j = j + 1u)
        {
          var f_index = i * u32(filterMatrix.size.x) + j;
          
          if (dataMatrix.numbers[f_index] < filterMatrix.numbers[j])
          {
            valid = 1;
          } 
        }

        
        for (var k = 0u; k < u32(2.0 * filterMatrix.size.x); k = k + 2u)
        
        {
          if (valid == 0)
          {
            var index = i * u32(filterMatrix.size.x) + k;
            var index_plus= index + 1u;
            resultMatrix.numbers[index] = f32(k) / (filterMatrix.size.x);
            resultMatrix.numbers[index_plus] = dataMatrix.numbers[index];
          }
          else
          {
            var index = i * u32(filterMatrix.size.x) + (2u * k);
            var index_plus= index + 1u;
            resultMatrix.numbers[index] = f32(k) / (filterMatrix.size.x);
            resultMatrix.numbers[index_plus] = 100.0;
          }
          
        }
      }
    }