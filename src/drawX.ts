import * as data from "./nutrients.json";

var nutrientValue = 1.0;
var groupValue = 1.0;
var protien = 1.0;
var calcium = 1.0;
var sodium = 1.0;
var fiber = 1.0;
var vitaminc = 1.0;
var potassium = 1.0;
var carbohydrate = 1.0;
var sugars = 1.0;
var fat = 1.0;
var water = 1.0;
var calories = 1.0;
var saturated = 1.0;
var monounsat = 1.0;
var polyunsat = 1.0;

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

async function InitGPU() {
  let canvas = document.getElementById("canvas-webgpu") as HTMLCanvasElement;
  let adapter = await navigator.gpu?.requestAdapter();
  let device = (await adapter?.requestDevice()) as GPUDevice;
  let context = canvas.getContext("webgpu") as unknown as GPUCanvasContext;

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

export function drawX() {
  console.log("drawing");
  let urlToFloatFile = "./xData.txt";
  let request = new XMLHttpRequest();

  request.open("GET", urlToFloatFile, true);
  request.responseType = "arraybuffer";

  request.onload = function () {
    var w = window.innerWidth;
    var h = window.innerHeight;

    console.log(w,h);
    
    var data = this.response;
    
    for (var i = 0; i < data.length; i++)
    {
      if (i % 2 == 0)
      {
        data[i] = data[i] * w;
      }
      else
      {
        data[i] = data[i] * h;
      }
    }
    var results = new Float32Array(data);
    console.log(data);
    CreateLineStrips(results);
  };
  request.send();
}
