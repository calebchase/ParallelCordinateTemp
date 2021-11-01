import { create } from "domain";

var filtersAdded = false;
var filters = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
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
var max: Array<number> = [
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

function createUniformBuffer(device: GPUDevice, data: Float32Array) {
  let buffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  new Float32Array(buffer.getMappedRange()).set(data);
  buffer.unmap();
  return buffer;
}

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
    filters[index] = Number.parseFloat(filter.value);
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

  [[block]] struct Uniforms {
    in: [[stride(16)]]array<f32, 19>;
  };
  [[group(0), binding(0)]] var<uniform> uniforms: Uniforms;

  [[stage(vertex)]]
  fn main([[location(0)]] pos: vec4<f32>, [[location(1)]] color: vec4<f32>) -> Output {
    var output: Output;

    var maxX = uniforms.in[0];
    var xRenderRange: array<f32, 2> = array<f32, 2>(uniforms.in[1], uniforms.in[2]);
    var yRenderRange: array<f32, 2> = array<f32, 2>(uniforms.in[3], uniforms.in[4]);
    var offset: i32 = 5;

    output.vColor = color;
    output.Position = pos;

    output.Position.y = pos.y / (uniforms.in[i32(round(pos.x)) + offset] / (yRenderRange[1] - yRenderRange[0])) + yRenderRange[0];
    output.Position.x = pos.x / (maxX / (xRenderRange[1] - xRenderRange[0])) + xRenderRange[0];

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
  console.log(uniData);

  const uniformBuffer = device.createBuffer({
    size: size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  let uniDataBuffer = createUniformBuffer(device, new Float32Array(uniData));
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "uniform",
        },
      },
    ],
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
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
            },
            alpha: {
              operation: "max",
              srcFactor: "one",
              dstFactor: "one-minus-dst",
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

let CreateLineStrips = async (lineStrips: Float32Array, frame: any) => {
  let gpu = await InitGPU();
  let device = gpu.device;

  let colorDataGrey = new Float32Array([0.08, 0.08, 0.08, 0.2]);
  let colorDataBlack = new Float32Array([0, 0, 1.0]);
  let uniDataInit = createArrayUni();

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

  let windowBuffeer = CreateGPUBufferFloat32(device, frame);
  let indirectParameters = getIndirectParameters(lineStrips.length / 2);
  let indrectBuffer = CreateGPUBufferIndirect(device, indirectParameters);
  let vertexBuffer = CreateGPUBufferFloat32(device, lineStrips);
  let uniBindGroup = createUniBindGroup(device, pipeline, uniDataInit);

  let colorBufferGrey = CreateGPUBufferFloat32(device, colorDataGrey);
  let colorBufferBlack = CreateGPUBufferFloat32(device, colorDataBlack);

  renderPass.setPipeline(pipeline);
  renderPass.setBindGroup(0, uniBindGroup);
  renderPass.setVertexBuffer(0, vertexBuffer);
  renderPass.setVertexBuffer(1, colorBufferGrey);
  renderPass.drawIndirect(indrectBuffer, 0);

  renderPass.setVertexBuffer(0, windowBuffeer);
  renderPass.setVertexBuffer(1, colorBufferBlack);
  renderPass.drawIndirect(indrectBuffer, 0);

  renderPass.endPass();
  device.queue.submit([commandEncoder.finish()]);
};

function cleanData(data: Array<JSON>) {
  // Help scaling for making it full width need to figure out what exact values are the best
  var values = [];
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
      if (filters[j] > val) {
        valid = false;
      }
      j++;
    });

    j = 0;
    if (valid) {
      row.forEach((val) => {
        values.push(j);
        values.push(val);
        j++;
      });
      values.push(undefined);
      values.push(undefined);
    }
  }

  let frame = [];
  frame.push(0.8, 7);
  frame.push(1.2, 7);
  frame.push(1.2, 5);
  frame.push(0.8, 5);
  frame.push(0.8, 7);
  frame.push(undefined);
  frame.push(undefined);

  return { values: values, frame: frame };
}
export function drawX() {
  let urlToFloatFile = "./nutrients.json";
  let request = new XMLHttpRequest();

  request.open("GET", urlToFloatFile, true);
  request.responseType = "json";

  request.onload = function () {
    var data = this.response;
    data = cleanData(data);
    var results = new Float32Array(data.values);
    var frame = new Float32Array(data.frame);
    CreateLineStrips(results, frame);
  };
  request.send();
}
