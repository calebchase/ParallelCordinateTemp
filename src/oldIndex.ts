let Shaders = () => {
  const vertex = `
        [[stage(vertex)]]
        fn main([[builtin(vertex_index)]] VertexIndex: u32) -> [[builtin(position)]] vec4<f32> {
            var pos = array<vec2<f32>, 6>(             
                vec2<f32>(-1.0, 1.0),
                vec2<f32>( -.5,  -.25),
                vec2<f32>( -0.25,  0.2),
                vec2<f32>( 0.0, -0.5),
                vec2<f32>(0.4, -0.4),
                vec2<f32>(0.8,  0.2)
            );
            return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
        }`;

  const fragment = `
        [[stage(fragment)]]
        fn main() ->  [[location(0)]] vec4<f32> {
            return vec4<f32>(1.0, 1.0, 0.0, 1.0);
        }`;
  return { vertex, fragment };
};

const CreatePrimitive = async () => {
  const primitiveType = "line-strip";
  const indexFormat = "uint32";

  const canvas = document.getElementById("canvas-webgpu") as HTMLCanvasElement;
  const adapter = (await navigator.gpu?.requestAdapter()) as GPUAdapter;
  const device = (await adapter?.requestDevice()) as GPUDevice;
  const context: any = canvas.getContext("webgpu");

  const format = "bgra8unorm";
  context.configure({
    device: device,
    format: format,
  });

  const vertices = new Float32Array([-1, 0.5, 0, 0, 0.5, 1]);
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
  vertexBuffer.unmap();

  const shader = Shaders();
  const pipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: shader.vertex,
      }),
      entryPoint: "main",
    },
    fragment: {
      module: device.createShaderModule({
        code: shader.fragment,
      }),
      entryPoint: "main",
      targets: [
        {
          format: format as GPUTextureFormat,
        },
      ],
    },
    primitive: {
      topology: primitiveType as GPUPrimitiveTopology,
      stripIndexFormat: indexFormat as GPUIndexFormat,
    },
  });

  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();

  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView as GPUTextureView,
        loadValue: [0.5, 0.5, 0.5, 1], //background color
        storeOp: "store",
      },
    ],
  });
  renderPass.setPipeline(pipeline);
  renderPass.draw(6);
  renderPass.endPass();

  device.queue.submit([commandEncoder.finish()]);
};

window.onload = () => CreatePrimitive();
