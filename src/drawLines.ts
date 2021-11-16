var filtersAdded = false;
var filters = [15,1,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,0,82.4, 2.24, 38.758, 53.1, 0.5667, 4.74, 89, 74.46, 100, 98.69, 902, 95.6, 83.689, 74.623, -1];

var names = [
  'protein (g)', 'calcium (g)',
  'sodium (g)', 'fiber (g)',
  'vitaminc (g)', 'potassium (g)',
  'carbohydrate (g)', 'sugars (g)',
  'fat (g)', 'water (g)',
  'calories', 'saturated (g)',
  'monounsat (g)', 'polyunsat (g)']
var max = [
  82.4, 2.24, 38.758, 53.1, 0.5667, 4.74, 89, 74.46, 100, 98.69, 902, 95.6, 83.689, 74.623];
var data;

function CreateGPUBufferFloat32(device: GPUDevice, data: Float32Array) {
  let buffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(buffer.getMappedRange()).set(data);
  buffer.unmap();
  return buffer;
}

function CreateGPUBufferIndirect(device: GPUDevice, data: Uint32Array) {
  let buffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.INDIRECT,
    mappedAtCreation: true,
  });
  new Uint32Array(buffer.getMappedRange()).set(data);
  buffer.unmap();
  return buffer;
}
function createFilter(name: string, max: number, index: number) {
  var filters_div = document.getElementById("filters");
  var filter = document.createElement("input");
  filter.type = ("range");
  filter.id = name;
  filter.name = name;
  filter.min = "0";
  filter.value = "0";
  filter.max = max.toString();
  filter.onchange = function (e) {
    filters[index + 2] = Number.parseFloat(filter.value);
    drawX();
  }

  filters_div?.appendChild(filter);

  var label = document.createElement("label");

  label.innerHTML = name;


  filters_div?.appendChild(label);


}
function createForms() {


  for (var i: number = 0; i < max.length; i++) {
    createFilter(names[i], max[i], i);
  }

  filtersAdded = true;
}
async function InitGPU() {
  let canvas = document.getElementById("canvas-webgpu") as HTMLCanvasElement;
  let adapter = await navigator.gpu?.requestAdapter();
  let device = (await adapter?.requestDevice()) as GPUDevice;
  let context = canvas.getContext("webgpu") as unknown as GPUCanvasContext;
  let filters_div = document.getElementById("filters");

  if (!filtersAdded) {
    createForms();
  }


  let devicePixelRatio = window.devicePixelRatio || 1;
  let size = [
    canvas.clientWidth * devicePixelRatio,
    canvas.clientHeight * devicePixelRatio,
  ];
  let format = context.getPreferredFormat(adapter!);

  context.configure({
    device: device,
    format: format,
    size: size,
  });
  return { device, canvas, format, context };
}

function shaders() {
  let vertex = `
  struct Output {
    [[builtin(position)]] Position : vec4<f32>;
    [[location(0)]] vColor : vec4<f32>;
  };
  [[stage(vertex)]]
  fn main([[location(0)]] pos: vec4<f32>, [[location(1)]] color: vec4<f32>) -> Output {
    var output: Output;
    
    output.Position = pos;
    output.vColor = color;

  
    output.Position.y = pos.y / 4.0 - 1.0;
    return output;
  }`;

  let fragment = `
  [[stage(fragment)]]
  fn main([[location(0)]] vColor: vec4<f32>) -> [[location(0)]] vec4<f32> {
    return vColor;
  }`;

  return {
    vertex,
    fragment,
  };
}

function getIndirectParameters(count: number) {
  let drawIndirectParameters = new Uint32Array(4);

  drawIndirectParameters[0] = count;
  drawIndirectParameters[1] = 1;
  drawIndirectParameters[2] = 0;
  drawIndirectParameters[3] = 0; // firstInstance. Must be 0.

  return drawIndirectParameters;
}

function getPipline(device: GPUDevice, gpu: any) {
  let primitiveType = "line-strip";
  let indexFormat = "uint32";

  let shader = shaders();

  let pipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: shader.vertex,
      }),
      entryPoint: "main",
      buffers: [
        {
          arrayStride: 8,
          attributes: [
            {
              shaderLocation: 0,
              format: "float32x2",
              offset: 0,
            },
          ],
        },
        {
          // arrayStride: 12,
          arrayStride: 0,
          attributes: [
            {
              shaderLocation: 1,
              format: "float32x3",
              offset: 0,
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: shader.fragment,
      }),
      entryPoint: "main",
      targets: [
        {
          format: gpu.format as GPUTextureFormat,
        },
      ],
    },
    primitive: {
      topology: primitiveType as GPUPrimitiveTopology,
      stripIndexFormat: indexFormat as GPUIndexFormat,
    },
  });

  return pipeline;
}

let CreateLineStrips = async (data: Float32Array, indices: Float32Array) => {
  let gpu = await InitGPU();
  let device = gpu.device;

const gpuBufferdataMatrix = device.createBuffer({
  mappedAtCreation: true,
  size: data.byteLength,
  usage: GPUBufferUsage.STORAGE
});

const arrayBufferdataMatrix = gpuBufferdataMatrix.getMappedRange();
new Float32Array(arrayBufferdataMatrix).set(data);
gpuBufferdataMatrix.unmap();

// Filter Buffer

console.log("num rows", data[0]);
console.log("num rows", ( data[0] - 2) / filters[0]);
const filterArray = new Float32Array(filters)
const gpuBufferFilterMatrix = device.createBuffer({
  mappedAtCreation: true,
  size: filterArray.byteLength,
  usage: GPUBufferUsage.STORAGE
});

const arrayBufferFilterMatrix = gpuBufferFilterMatrix.getMappedRange();
new Float32Array(arrayBufferFilterMatrix).set(filterArray);
gpuBufferFilterMatrix.unmap();

const maxArray = new Float32Array(max)
const gpuBufferMaxMatrix = device.createBuffer({
  mappedAtCreation: true,
  size: maxArray.byteLength,
  usage: GPUBufferUsage.STORAGE
});

const arrayBufferMaxMatrix = gpuBufferMaxMatrix.getMappedRange();
new Float32Array(arrayBufferMaxMatrix).set(maxArray);
gpuBufferFilterMatrix.unmap();
// Result Matrix

const resultMatrixBufferSize = Float32Array.BYTES_PER_ELEMENT * (2 + ( 2 * data[0] * data[1]));
const resultMatrixBuffer = device.createBuffer({
  size: resultMatrixBufferSize,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
});



const shaderModule = device.createShaderModule({
  code: `
  [[block]] struct Matrix {
    size : vec2<f32>;
    numbers: array<f32>;
  };

  [[group(0), binding(0)]] var<storage, read> dataMatrix : Matrix;
  [[group(0), binding(1)]] var<storage, read> filterMatrix : Matrix;
  [[group(0), binding(2)]] var<storage, write> resultMatrix : Matrix;
  [[group(0), binding(3)]] var<storage, write> resultMatrix2 : Matrix;
 
  
  [[stage(compute), workgroup_size(8, 8)]]
  fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
    // Guard against out-of-bounds work group sizes
    if (global_id.x >= u32(dataMatrix.size.x) || global_id.y >= u32(filterMatrix.size.y)) {
      return;
    }

    resultMatrix.size = vec2<f32>(dataMatrix.size.x * dataMatrix.size.y, f32(2.0));
    var row = 0.0;
    var dataIndex = 0;
    

    // Goes through all rows in the dataMatrix
    for (var i = 0u; i < u32(dataMatrix.size.x); i = i + 1u)
    {
      var valid = 0;

      for (var k = 0u; k < u32(filterMatrix.size.x - 1.0); k = k + 1u)
      {
        if (dataMatrix.numbers[dataIndex] < ( filterMatrix.numbers[k] / filterMatrix.numbers[u32(filterMatrix.size.x) + k]))
        {
          valid = 1;
        }
        dataIndex = dataIndex + 1;
      }

      dataIndex = dataIndex - i32(filterMatrix.size.x - 1.0);
      
      
        for (var j =0u; j < u32(filterMatrix.size.x); j = j + 1u)
        {
         
          if (valid == 0)
          {
            resultMatrix.numbers[dataIndex] = dataMatrix.numbers[dataIndex];
           
          }
          else
          {
            resultMatrix.numbers[dataIndex] = 0.0;
          }
          dataIndex = dataIndex + 1;
         
        }      
    }
  }
  `
});
  // Pipeline setup
  
  const computePipeline = device.createComputePipeline({
    compute: {
      module: shaderModule,
      entryPoint: "main"
    }
  });

const bindGroup = device.createBindGroup({
  layout: computePipeline.getBindGroupLayout(0 /* index */),
  entries: [
    {
      binding: 0,
      resource: {
        buffer: gpuBufferdataMatrix
      }
    },
    {
      binding: 1,
      resource: {
        buffer: gpuBufferFilterMatrix
      }
    },
    {
      binding: 2,
      resource: {
        buffer: resultMatrixBuffer
      }
    },
    
  ]
});



var commandEncoder1 = device.createCommandEncoder();

const passEncoder = commandEncoder1.beginComputePass();
passEncoder.setPipeline(computePipeline);
passEncoder.setBindGroup(0, bindGroup);
passEncoder.dispatch(8, 8);
passEncoder.endPass();


// Get a GPU buffer for reading in an unmapped state.
const gpuReadBuffer = device.createBuffer({
  size: resultMatrixBufferSize,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
});

// Encode commands for copying buffer to buffer.
commandEncoder1.copyBufferToBuffer(
  resultMatrixBuffer /* source buffer */,
  0 /* source offset */,
  gpuReadBuffer /* destination buffer */,
  0 /* destination offset */,
  resultMatrixBufferSize /* size */
);

// Submit GPU commands.
const gpuCommands = commandEncoder1.finish();
device.queue.submit([gpuCommands]);

// Read buffer.
await gpuReadBuffer.mapAsync(GPUMapMode.READ);
const arrayBuffer = gpuReadBuffer.getMappedRange();
console.log(new Float32Array(arrayBuffer));


  let colorData = new Float32Array([.5, .5, .5]);

  let commandEncoder = device.createCommandEncoder();
  let textureView = gpu.context.getCurrentTexture().createView();

  let renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        //background color
        loadValue: { r: 1.0, g: 1.0, b: 1.0, a: 1 },
        storeOp: "store",
      },
    ],
  });

  let pipeline = getPipline(device, gpu);

  let indirectParameters = getIndirectParameters(data.length / 2);
  let indrectBuffer = CreateGPUBufferIndirect(device, indirectParameters);
  let vertexBuffer = CreateGPUBufferFloat32(device, new Float32Array(arrayBuffer));
  let colorBuffer = CreateGPUBufferFloat32(device, colorData);

  renderPass.setPipeline(pipeline);
  renderPass.setVertexBuffer(0, vertexBuffer);
  renderPass.setVertexBuffer(2, vertexBuffer);
  renderPass.setVertexBuffer(1, colorBuffer);
  renderPass.drawIndirect(indrectBuffer, 0);
  renderPass.endPass();

  device.queue.submit([commandEncoder.finish()]);
};


function isValidLine() {

  return true;
}


function prepareData(data: Array<JSON>)
{
  var categories = Object.values(data[0]);
  categories = categories.slice(2, categories.length);

  // Array starts with #rows and #columns
  var yValues = []
  var xValues = []
  xValues.push(data.length * categories.length + 1);
  xValues.push(1);
  yValues.push(data.length);
  yValues.push(categories.length + 1);

  for (var i = 0; i < data.length; i++)
  {
    var row = Object.values(data[i])
    row = row.slice(2, row.length);

    for (var j = 0; j < row.length; j++)
    {
      var index = ((- row.length / 2) + j ) / row.length;
      xValues.push(index * 2.5);
      yValues.push((row[j] / max[j]) * 7.5);
      if (j + 1 === row.length)
      {
        xValues.push(0.0);
        yValues.push(0.0);
      }
    }
  }
  return {yValues: yValues,
          xValues: xValues
  };
}
function cleanData(data: Array<JSON>) {

  // Help scaling for making it full width need to figure out what exact values are the best
  var w = 2.5;
  var h = 7.5;
  var values = [];
  var count = data.length;
  var max = Object.values(data[0])
  max = max.slice(2, max.length);

  for (var i = 0; i < count; i++) {
    var row = Object.values(data[i])
    var row = row.slice(2, row.length);

    for (var j = 0; j < row.length; j++) {
      if (row[j] !== null && row[j] !== undefined) {
        max[j] = Math.max(row[j], max[j]);
      }
    }
  }

  for (var i = 0; i < count; i++) {
    var row = Object.values(data[i])
    var row = row.slice(2, row.length);
    var j = -1 * (max.length / 2);
    var index = 0;
    var valid = true;

    row.forEach((val) => {
      if (filters[index] > val) {
        valid = false;
      }
      index++;
    })
    index = 0;

    if (valid) {


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
  return values;
}
export function drawX() {
  let urlToFloatFile = "./nutrients.json";
  let request = new XMLHttpRequest();

  request.open("GET", urlToFloatFile, true);
  request.responseType = "json";

  request.onload = function () {
    var w = 1;
    var h = 1;
    var data = this.response;
    var buffer = prepareData(data);
    CreateLineStrips(new Float32Array(buffer.yValues),new Float32Array(buffer.xValues));
  };
  request.send();
}
