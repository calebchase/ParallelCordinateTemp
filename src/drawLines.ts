var filtersAdded = false;
var filters = [
  15, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 82.4, 2.24, 38.758, 53.1,
  0.5667, 4.74, 89, 74.46, 100, 98.69, 902, 95.6, 83.689, 74.623, -1,
];
var loaded = false;
var names = [
  "protein (g)",
  "calcium (g)",
  "sodium (g)",
  "fiber (g)",
  "vitaminc (g)",
  "potassium (g)",
  "carbohydrate (g)",
  "sugars (g)",
  "fat (g)",
  "water (g)",
  "calories",
  "saturated (g)",
  "monounsat (g)",
  "polyunsat (g)",
];
var max = [
  82.4, 2.24, 38.758, 53.1, 0.5667, 4.74, 89, 74.46, 100, 98.69, 902, 95.6,
  83.689, 74.623,
];
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

// function createUniformBuffer(device: GPUDevice, data: Float32Array) {
//   let buffer = device.createBuffer({
//     size: data.byteLength,
//     usage: GPUBufferUsage.UNIFORM,
//     mappedAtCreation: true,
//   });
//   new Float32Array(buffer.getMappedRange()).set(data);
//   buffer.unmap();
//   return buffer;
// }

function createFilter(name: string, max: number, index: number) {
  var filters_div = document.getElementById("filters");
  var filter = document.createElement("input");
  filter.type = "range";
  filter.id = name;
  filter.name = name;
  filter.min = "0";
  filter.value = "0";
  filter.max = max.toString();
  filter.onchange = function (e) {
    filters[index + 2] = Number.parseFloat(filter.value);
    console.log(filters);
    drawX();
  };

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

function computeShader() {
  return `
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
        if (dataMatrix.numbers[dataIndex] < ( filterMatrix.numbers[k] / filterMatrix.numbers[u32(filterMatrix.size.x + 1.0) + k]))
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
  `;
}

function shaders() {
  let vertex = `
  struct Output {
    [[builtin(position)]] Position : vec4<f32>;
    [[location(0)]] vColor : vec4<f32>;
  };

  [[block]] struct Uniforms {
    in: [[stride(16)]]array<f32, 19>;
  };

  [[group(0), binding(0)]] var<uniform> uniforms: Uniforms;

  [[stage(vertex)]]
  fn main([[location(0)]] posX: f32, [[location(1)]] posY: f32, [[location(2)]] color: vec4<f32>) -> Output {
    var output: Output;

    var maxX = uniforms.in[0];
    var xRenderRange: array<f32, 2> = array<f32, 2>(uniforms.in[1], uniforms.in[2]);
    var yRenderRange: array<f32, 2> = array<f32, 2>(uniforms.in[3], uniforms.in[4]);
    var offset: i32 = 5;

    output.Position.y = posY / (uniforms.in[i32(posX) + offset] / (yRenderRange[1] - yRenderRange[0])) + yRenderRange[0];
    output.Position.x = posX / (maxX / (xRenderRange[1] - xRenderRange[0])) + xRenderRange[0];
    output.Position.z = 0.0;
    output.Position.w = 1.0;

    output.vColor = color;

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

function createArrayUni() {
  let uniDataInit = [
    88.32, 7.364, 38.758, 79.0, 2.4, 16.5, 100.0, 99.8, 100.0, 100.0, 902.0,
    95.6, 83.689, 74.623,
  ];

  let xRenderRange = [-0.7, 0.95];
  let yRenderRange = [-0.9, 0.9];

  uniDataInit = [
    uniDataInit.length - 1,
    ...xRenderRange,
    ...yRenderRange,
    ...uniDataInit,
  ];

  return uniDataInit;
}

function createUniBindGroup(
  device: GPUDevice,
  pipeline: any,
  uniDataInit: Array<number>
) {
  let uniData = [];
  for (let i = 0; i < uniDataInit.length * 4; i++) {
    if (i % 4 == 0) {
      uniData.push(uniDataInit[i / 4]);
    } else {
      uniData.push(0);
    }
  }
  let size = uniData.length * 4;

  const uniformBuffer = device.createBuffer({
    size: size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    // layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          size: size,
        },
      },
    ],
  });

  device.queue.writeBuffer(
    uniformBuffer,
    0,
    new Float32Array(uniData) as ArrayBuffer
  );

  return uniBindGroup;
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
          arrayStride: 4,
          attributes: [
            {
              shaderLocation: 0,
              format: "float32",
              offset: 0,
            },
          ],
        },
        {
          arrayStride: 4,
          attributes: [
            {
              shaderLocation: 1,
              format: "float32",
              offset: 0,
            },
          ],
        },
        {
          // arrayStride: 12,
          arrayStride: 0,
          attributes: [
            {
              shaderLocation: 2,
              format: "float32x4",
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
          blend: {
            color: {
              operation: "add",
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
            },
            alpha: {
              operation: "add",
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
            },
          },
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

let CreateLineStrips = async (
  data: Float32Array,
  indices: Float32Array,
  init: boolean,
  filterData: any
) => {
  let colorDataGrey = new Float32Array([0, 0, 0, 0.2]);
  let colorDataGreen = new Float32Array([0, 1, 0, 0.2]);
  let uniDataInit = createArrayUni();

  let gpu = await InitGPU();
  let device = gpu.device;

  const gpuBufferdataMatrix = device.createBuffer({
    mappedAtCreation: true,
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE,
  });

  const arrayBufferdataMatrix = gpuBufferdataMatrix.getMappedRange();
  new Float32Array(arrayBufferdataMatrix).set(data);
  gpuBufferdataMatrix.unmap();

  // Filter Buffer
  const filterArray = new Float32Array(filters);
  const gpuBufferFilterMatrix = device.createBuffer({
    mappedAtCreation: true,
    size: filterArray.byteLength,
    usage: GPUBufferUsage.STORAGE,
  });

  const arrayBufferFilterMatrix = gpuBufferFilterMatrix.getMappedRange();
  new Float32Array(arrayBufferFilterMatrix).set(filterArray);
  gpuBufferFilterMatrix.unmap();

  const maxArray = new Float32Array(max);
  const gpuBufferMaxMatrix = device.createBuffer({
    mappedAtCreation: true,
    size: maxArray.byteLength,
    usage: GPUBufferUsage.STORAGE,
  });

  const arrayBufferMaxMatrix = gpuBufferMaxMatrix.getMappedRange();
  new Float32Array(arrayBufferMaxMatrix).set(maxArray);
  gpuBufferFilterMatrix.unmap();
  // Result Matrix

  const resultMatrixBufferSize =
    Float32Array.BYTES_PER_ELEMENT * (2 + 2 * data[0] * data[1]);
  const resultMatrixBuffer = device.createBuffer({
    size: resultMatrixBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const shaderModule = device.createShaderModule({
    code: computeShader(),
  });
  // Pipeline setup

  const computePipeline = device.createComputePipeline({
    compute: {
      module: shaderModule,
      entryPoint: "main",
    },
  });

  const bindGroup = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0 /* index */),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: gpuBufferdataMatrix,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: gpuBufferFilterMatrix,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: resultMatrixBuffer,
        },
      },
    ],
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
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
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

  let colorData = new Float32Array([0.5, 0.5, 0.5]);

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

  let indirectParameters = getIndirectParameters(data.length);
  let indrectBuffer = CreateGPUBufferIndirect(device, indirectParameters);
  let uniBindGroup = createUniBindGroup(device, pipeline, uniDataInit);

  let vertexBufferX = CreateGPUBufferFloat32(device, data);
  let vertexBufferY = CreateGPUBufferFloat32(device, indices);
  let colorBufferGrey = CreateGPUBufferFloat32(device, colorDataGrey);

  renderPass.setPipeline(pipeline);

  renderPass.setBindGroup(0, uniBindGroup);
  renderPass.setVertexBuffer(0, vertexBufferX);
  renderPass.setVertexBuffer(1, vertexBufferY);
  renderPass.setVertexBuffer(2, colorBufferGrey);

  renderPass.drawIndirect(indrectBuffer, 0);
  // draw green
  if (!init) {
    let vertexBufferXFilter = CreateGPUBufferFloat32(
      device,
      new Float32Array(arrayBuffer)
    );
    let vertexBufferYFilter = CreateGPUBufferFloat32(device, indices);
    let colorBufferGreen = CreateGPUBufferFloat32(device, colorDataGreen);

    renderPass.setBindGroup(0, uniBindGroup);
    renderPass.setVertexBuffer(0, vertexBufferXFilter);
    renderPass.setVertexBuffer(1, vertexBufferYFilter);
    renderPass.setVertexBuffer(2, colorBufferGreen);
    renderPass.drawIndirect(indrectBuffer, 0);
  }

  renderPass.endPass();
  device.queue.submit([commandEncoder.finish()]);
};

function isValidLine() {
  return true;
}

function prepareData(data: Array<JSON>) {
  var categories = Object.values(data[0]);
  categories = categories.slice(2, categories.length);

  // Array starts with #rows and #columns
  var yValues = [];
  var xValues = [];
  xValues.push(data.length * categories.length + 1);
  xValues.push(1);
  yValues.push(data.length);
  yValues.push(categories.length + 1);

  for (var i = 0; i < data.length; i++) {
    var row = Object.values(data[i]);
    row = row.slice(2, row.length);

    for (var j = 0; j < row.length; j++) {
      max[j] = Math.max(max[j], row[j]);
      var index = j;
      xValues.push(index);
      yValues.push(row[j]);
      if (j + 1 === row.length) {
        xValues.push(0.0);
        yValues.push(0.0);
      }
    }
  }
  return { yValues: yValues, xValues: xValues };
}

function cleanData(data: Array<JSON>, doFilter: boolean) {
  // Help scaling for making it full width need to figure out what exact values are the best
  var valY = [];
  var valX = [];
  var count = data.length;
  var max = Object.values(data[0]);
  max = max.slice(2, max.length);

  for (var i = 0; i < count; i++) {
    var row = Object.values(data[i]);
    var row = row.slice(2, row.length);

    for (var j = 0; j < row.length; j++) {
      if (row[j] !== null && row[j] !== undefined) {
        max[j] = Math.max(row[j], max[j]);
      }
    }
  }

  for (var i = 0; i < count; i++) {
    var row = Object.values(data[i]);
    var row = row.slice(2, row.length);
    var j = 0;
    var valid = true;

    row.forEach((val) => {
      if (filters[j] > val && doFilter) {
        valid = false;
      }
      j++;
    });

    j = 0;
    if (valid) {
      row.forEach((val) => {
        valX.push(j);
        valY.push(val);
        j++;
      });
      valX.push(undefined);
      valY.push(undefined);
    }
  }

  return { valX: valX, valY: valY };
}

let init = true;
export function drawX() {
  let urlToFloatFile = "./nutrients.json";
  let request = new XMLHttpRequest();

  request.open("GET", urlToFloatFile, true);
  request.responseType = "json";

  request.onload = function () {
    var data = this.response;
    var buffer = prepareData(data);
    let filterData: { valX: any; valY: any } = cleanData(data, true);

    data.valX = new Float32Array(buffer.xValues);
    data.valY = new Float32Array(buffer.yValues);

    filterData.valX = new Float32Array(buffer.xValues);
    filterData.valY = new Float32Array(buffer.yValues);

    CreateLineStrips(
      new Float32Array(buffer.xValues),
      new Float32Array(buffer.yValues),
      init,
      filterData
    );
    init = false;
  };
  request.send();
}
