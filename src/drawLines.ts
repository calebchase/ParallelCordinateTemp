var filtersAdded = false;
var filters = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var names = [
  'protein (g)', 'calcium (g)',
  'sodium (g)', 'fiber (g)',
  'vitaminc (g)', 'potassium (g)',
  'carbohydrate (g)', 'sugars (g)',
  'fat (g)', 'water (g)',
  'calories', 'saturated (g)',
  'monounsat (g)', 'polyunsat (g)']
var max: Array<number> = [
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
    filters[index] = Number.parseFloat(filter.value);
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

let CreateLineStrips = async (lineStrips: Float32Array) => {
  let gpu = await InitGPU();
  let device = gpu.device;

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

  let indirectParameters = getIndirectParameters(lineStrips.length / 2);
  let indrectBuffer = CreateGPUBufferIndirect(device, indirectParameters);
  let vertexBuffer = CreateGPUBufferFloat32(device, lineStrips);
  let colorBuffer = CreateGPUBufferFloat32(device, colorData);

  renderPass.setPipeline(pipeline);
  renderPass.setVertexBuffer(0, vertexBuffer);
  renderPass.setVertexBuffer(1, colorBuffer);
  renderPass.drawIndirect(indrectBuffer, 0);
  renderPass.endPass();

  device.queue.submit([commandEncoder.finish()]);
};


function isValidLine() {

  return true;
}

function cleanData(data: Array<JSON>) {

  // Help scaling for making it full width need to figure out what exact values are the best
  var w = 2.0;
  var h = 7.5;
  var values = [];
  var count = data.length * .25;
  var max = Object.values(data[0])
  max = max.slice(2, max.length);
  console.log("columns", Object.keys(data[0]));

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
  console.log(values);
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
    data = cleanData(data)


    for (var i = 0; i < data.length; i++) {
      if (i % 2 == 0) {
        data[i] = data[i] * w;
      }
      else {
        data[i] = data[i] * h;
      }
    }
    console.log(data);
    var results = new Float32Array(data);
    CreateLineStrips(results);
  };
  request.send();
}
