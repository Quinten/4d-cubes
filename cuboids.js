// Convert deg in radians
deg2rad = angle => Math.PI * angle / 180;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// WebGL canvas context
var gl = canvas.getContext('webgl');

var vshader = `
attribute vec4 position;
attribute vec4 color;
attribute vec4 normal;
uniform mat4 mvp;
uniform mat4 model;            // model matrix
uniform mat4 inverseTranspose; // inversed transposed model matrix
varying vec4 v_color;
varying vec3 v_normal;
varying vec3 v_position;
void main() {

  // Apply the model matrix and the camera matrix to the vertex position
  gl_Position = mvp * position;

  // Set varying position for the fragment shader
  v_position = vec3(model * position);

  // Recompute the face normal
  v_normal = normalize(vec3(inverseTranspose * normal));

  // Set the color
  v_color = color;
}`;

// Fragment shader program
var fshader = `
precision mediump float;
uniform vec3 lightColor;
uniform vec3 lightPosition;
uniform vec3 ambientLight;
varying vec3 v_normal;
varying vec3 v_position;
varying vec4 v_color;
void main() {

  // Compute direction between the light and the current point
  vec3 lightDirection = normalize(lightPosition - v_position);

  // Compute angle between the normal and that direction
  float nDotL = max(dot(lightDirection, v_normal), 0.0);

  // Compute diffuse light proportional to this angle
  vec3 diffuse = lightColor * v_color.rgb * nDotL;

  // Compute ambient light
  vec3 ambient = ambientLight * v_color.rgb;

  // Compute total light (diffuse + ambient)
  gl_FragColor = vec4(diffuse + ambient, 1.0);
}`;

// Compile program
var program = compile(gl, vshader, fshader);

// Initialize a cube
var vertices, normals, indices;
[vertices, normals, indices] = cube();

// Count vertices
var n = indices.length;

// Set position, normal buffers
buffer(gl, vertices, program, 'position', 3, gl.FLOAT);
buffer(gl, normals, program, 'normal', 3, gl.FLOAT);

// Set indices
var indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// Set cube color
var color = gl.getAttribLocation(program, 'color');
gl.vertexAttrib3f(color, .7, .8, .1);

// Set the clear color and enable the depth test
gl.clearColor(0, 0, 0, 1);
gl.enable(gl.DEPTH_TEST);

// Set the camera
var cameraMatrix = perspective({fov: deg2rad(30), aspect: canvas.width / canvas.height, near: 1, far: 100});
cameraMatrix = transform(cameraMatrix, {z: -15});

// Set the point light color and position
var lightColor = gl.getUniformLocation(program, 'lightColor');
gl.uniform3f(lightColor, 1, 1, 1);

var lightPosition = gl.getUniformLocation(program, 'lightPosition');
gl.uniform3f(lightPosition, 2.5, 2.5, 2.5);

// Set the ambient light color
var ambientLight = gl.getUniformLocation(program, 'ambientLight');
gl.uniform3f(ambientLight, 0.4, 0.4, 0.4);

// Click the buttons to update the arm/hand angles
var ANGLE_STEP = deg2rad(3);
var armAngle = deg2rad(180);
var handAngle = deg2rad(45);

// Draw the complete arm
drawArm = (gl, n, cameraMatrix) => {

  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Shoulder
  var modelMatrix = identity();
  modelMatrix = transform(modelMatrix, {x: -3});
  drawShape(gl, program, cameraMatrix, modelMatrix, n, 2, 1, 1);

  // Arm
  var modelMatrix = identity();
  modelMatrix = transform(modelMatrix, {rx: armAngle}); // rotate
  modelMatrix = transform(modelMatrix, {y: -2});        // translate
  drawShape(gl, program, cameraMatrix, modelMatrix, n, 1, 3, 1);

  // Hand (reuse the same matrix!)
  modelMatrix = transform(modelMatrix, {ry: handAngle});  // rotate
  modelMatrix = transform(modelMatrix, {y: -3});          // translate
  drawShape(gl, program, cameraMatrix, modelMatrix, n, 2, .1, 2);
}

// Update the angles and redraw the arm at each frame
setInterval(() => {
    armAngle = (armAngle + ANGLE_STEP) % 360;
    handAngle = (handAngle + ANGLE_STEP) % 360;
    drawArm(gl, n, cameraMatrix);
}, 33);