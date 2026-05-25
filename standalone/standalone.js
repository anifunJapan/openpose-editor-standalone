fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerColor = "#108ce6";
fabric.Object.prototype.borderColor = "#108ce6";
fabric.Object.prototype.cornerSize = 10;

const connectKeypoints = [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7], [1, 8], [8, 9], [9, 10], [1, 11], [11, 12], [12, 13], [14, 0], [14, 16], [15, 0], [15, 17]];
const connectColor = [[0, 0, 255], [255, 0, 0], [255, 170, 0], [255, 255, 0], [255, 85, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85], [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85]];
const defaultKeypoints = [[241, 77], [241, 120], [191, 118], [177, 183], [163, 252], [298, 118], [317, 182], [332, 245], [225, 241], [213, 359], [215, 454], [270, 240], [282, 360], [286, 456], [232, 59], [253, 60], [225, 70], [260, 72]];
const historyProps = ["posePoint", "poseLine", "pointId", "fromPoint", "toPoint"];

const state = {
  canvas: null,
  lockHistory: false,
  undo: [],
  redo: []
};

const ui = {
  width: document.getElementById("widthInput"),
  height: document.getElementById("heightInput"),
  resize: document.getElementById("resizeButton"),
  add: document.getElementById("addPoseButton"),
  reset: document.getElementById("resetButton"),
  del: document.getElementById("deleteButton"),
  duplicate: document.getElementById("duplicateButton"),
  undo: document.getElementById("undoButton"),
  redo: document.getElementById("redoButton"),
  json: document.getElementById("jsonInput"),
  bg: document.getElementById("backgroundInput"),
  saveJson: document.getElementById("saveJsonButton"),
  savePng: document.getElementById("savePngButton"),
  preset: document.getElementById("presetSelect"),
  loadPreset: document.getElementById("loadPresetButton"),
  savePreset: document.getElementById("savePresetButton"),
  stage: document.getElementById("canvasStage"),
  status: document.getElementById("status")
};

function status(text) {
  ui.status.textContent = text;
}

function canvasJson() {
  return JSON.stringify(state.canvas.toJSON(historyProps));
}

function pushHistory() {
  if (state.lockHistory) return;
  state.undo.push(canvasJson());
  if (state.undo.length > 80) state.undo.shift();
  state.redo.length = 0;
}

function restore(json) {
  state.lockHistory = true;
  state.canvas.loadFromJSON(json, () => {
    relinkLines();
    state.canvas.renderAll();
    fitCanvas();
    state.lockHistory = false;
  });
}

function undo() {
  if (state.undo.length <= 1) return;
  state.redo.push(state.undo.pop());
  restore(state.undo[state.undo.length - 1]);
  status("Undo");
}

function redo() {
  if (!state.redo.length) return;
  const json = state.redo.pop();
  state.undo.push(json);
  restore(json);
  status("Redo");
}

function fitCanvas() {
  const canvas = state.canvas;
  const stage = ui.stage.getBoundingClientRect();
  const ratio = Math.min(stage.width / canvas.getWidth(), stage.height / canvas.getHeight(), 1);
  canvas.setDimensions({
    width: `${Math.max(64, Math.floor(canvas.getWidth() * ratio))}px`,
    height: `${Math.max(64, Math.floor(canvas.getHeight() * ratio))}px`
  }, { cssOnly: true });
  canvas.calcOffset();
}

function resizeCanvas(width, height, keepHistory = true) {
  state.canvas.setDimensions({ width, height });
  ui.width.value = width;
  ui.height.value = height;
  fitCanvas();
  state.canvas.renderAll();
  if (keepHistory) pushHistory();
}

function makeLine(points, color, fromPoint, toPoint) {
  return new fabric.Line(points, {
    fill: color,
    stroke: color,
    strokeWidth: 10,
    selectable: false,
    evented: false,
    originX: "center",
    originY: "center",
    poseLine: true,
    fromPoint,
    toPoint
  });
}

function makeCircle(point, color, pointId, lineRefs) {
  const circle = new fabric.Circle({
    left: point[0],
    top: point[1],
    radius: 5,
    fill: color,
    stroke: color,
    strokeWidth: 1,
    originX: "center",
    originY: "center",
    hasControls: false,
    hasBorders: false,
    posePoint: true,
    pointId
  });
  circle._left = point[0];
  circle._top = point[1];
  circle.lineRefs = lineRefs;
  return circle;
}

function addPose(keypoints = defaultKeypoints, keepHistory = true) {
  const lines = connectKeypoints.map(([from, to], index) => {
    const line = makeLine(keypoints[from].concat(keypoints[to]), `rgba(${connectColor[index].join(", ")}, 0.7)`, from, to);
    state.canvas.add(line);
    return line;
  });

  const circles = keypoints.map((point, index) => {
    const refs = lines.filter((line) => line.fromPoint === index || line.toPoint === index);
    const circle = makeCircle(point, `rgb(${connectColor[index].join(", ")})`, index, refs);
    state.canvas.add(circle);
    return circle;
  });

  state.canvas.setActiveObject(new fabric.ActiveSelection(circles, { canvas: state.canvas }));
  state.canvas.requestRenderAll();
  if (keepHistory) pushHistory();
  status("Pose added");
}

function updatePoint(point, left, top) {
  point._left = left;
  point._top = top;
  if (!point.lineRefs) return;
  point.lineRefs.forEach((line) => {
    if (line.fromPoint === point.pointId) line.set({ x1: left, y1: top });
    if (line.toPoint === point.pointId) line.set({ x2: left, y2: top });
  });
}

function updateLines(target) {
  if (target._objects) {
    const center = target.getCenterPoint();
    const angle = fabric.util.degreesToRadians(target.angle || 0);
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const flipX = target.flipX ? -1 : 1;
    const flipY = target.flipY ? -1 : 1;

    target._objects.filter((item) => item.posePoint).forEach((point) => {
      const localX = point.left * target.scaleX * flipX;
      const localY = point.top * target.scaleY * flipY;
      updatePoint(point, center.x + localX * cos - localY * sin, center.y + localX * sin + localY * cos);
    });
  } else if (target.posePoint) {
    updatePoint(target, target.left, target.top);
  }
  state.canvas.renderAll();
}

function relinkLines() {
  const objects = state.canvas.getObjects();
  const lines = objects.filter((item) => item.poseLine);
  const points = objects.filter((item) => item.posePoint);
  points.forEach((point) => {
    point.lineRefs = lines.filter((line) => line.fromPoint === point.pointId || line.toPoint === point.pointId);
    point._left = point.left;
    point._top = point.top;
  });
}

function resetCanvas() {
  state.canvas.clear();
  state.canvas.backgroundColor = "#000";
  pushHistory();
  status("Reset");
}

function posePoints() {
  state.canvas.discardActiveObject();
  state.canvas.renderAll();
  return state.canvas.getObjects()
    .filter((item) => item.posePoint)
    .map((item) => [Math.round(item._left ?? item.left), Math.round(item._top ?? item.top)]);
}

function serializePose() {
  return JSON.stringify({
    width: state.canvas.getWidth(),
    height: state.canvas.getHeight(),
    keypoints: posePoints()
  }, null, 2);
}

function saveBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function saveJson() {
  saveBlob(new Blob([serializePose()], { type: "application/json" }), `pose-${Date.now()}.json`);
  status("JSON saved");
}

function savePng() {
  const background = state.canvas.backgroundImage;
  const opacity = background ? background.opacity : null;
  if (background) background.opacity = 0;
  state.canvas.discardActiveObject();
  state.canvas.renderAll();
  state.canvas.lowerCanvasEl.toBlob((blob) => saveBlob(blob, "pose.png"));
  if (background) background.opacity = opacity;
  state.canvas.renderAll();
  status("PNG saved");
}

function connected(a, b) {
  return connectKeypoints.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function fillMissing(points) {
  const result = points.slice(0, 18);
  while (result.length < 18) result.push([-1, -1]);
  if (result.every(([x, y]) => x === -1 && y === -1)) result[0] = [state.canvas.getWidth() / 2, state.canvas.getHeight() / 2];

  const relative = defaultKeypoints.map((base) => defaultKeypoints.map((point) => [point[0] - base[0], point[1] - base[1]]));
  while (result.some(([x, y]) => x === -1 && y === -1)) {
    let changed = false;
    for (let i = 0; i < result.length; i += 1) {
      if (result[i][0] === -1) continue;
      for (let j = 0; j < result.length; j += 1) {
        if (result[j][0] === -1 && connected(i, j)) {
          result[j] = [
            Math.min(Math.max(result[i][0] + relative[i][j][0], 0), state.canvas.getWidth()),
            Math.min(Math.max(result[i][1] + relative[i][j][1], 0), state.canvas.getHeight())
          ];
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return result.map((point, index) => point[0] === -1 ? defaultKeypoints[index] : point);
}

function openPoseV2People(json) {
  const width = json.canvas_width || json.width;
  const height = json.canvas_height || json.height;
  return json.people.map((person) => {
    const points = [];
    for (let i = 0; i < person.pose_keypoints_2d.length - 1; i += 3) {
      const x = person.pose_keypoints_2d[i];
      const y = person.pose_keypoints_2d[i + 1];
      const confidence = person.pose_keypoints_2d[i + 2];
      points.push(confidence === 0 ? [-1, -1] : [x * width * confidence, y * height * confidence]);
    }
    return fillMissing(points);
  });
}

function loadPoseJson(json) {
  const width = json.canvas_width || json.width;
  const height = json.canvas_height || json.height;
  if (!width || !height) throw new Error("JSON must include width and height.");

  state.lockHistory = true;
  state.canvas.clear();
  state.canvas.backgroundColor = "#000";
  resizeCanvas(width, height, false);
  state.lockHistory = false;

  if (json.people && json.people[0] && json.people[0].pose_keypoints_2d) {
    openPoseV2People(json).forEach((points) => addPose(points, false));
  } else if (json.keypoints && json.keypoints.length % 18 === 0) {
    for (let i = 0; i < json.keypoints.length; i += 18) addPose(json.keypoints.slice(i, i + 18), false);
  } else {
    throw new Error("JSON keypoints are invalid.");
  }
  pushHistory();
  status("JSON loaded");
}

function readJsonFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      loadPoseJson(JSON.parse(reader.result));
    } catch (error) {
      alert(error.message);
      status("JSON error");
    }
  };
  reader.readAsText(file);
}

function addBackground(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      const width = img.width || state.canvas.getWidth();
      const height = img.height || state.canvas.getHeight();
      resizeCanvas(width, height, false);
      state.canvas.setBackgroundImage(img, state.canvas.renderAll.bind(state.canvas), {
        scaleX: width / img.width,
        scaleY: height / img.height,
        opacity: 0.5,
        originX: "left",
        originY: "top"
      });
      pushHistory();
      status("Background added");
    });
  };
  reader.readAsDataURL(file);
}

function deleteSelection() {
  const active = state.canvas.getActiveObject();
  if (!active) return;
  const targets = active.type === "activeSelection" ? active.getObjects() : [active];
  targets.forEach((target) => {
    if (target.posePoint && target.lineRefs) target.lineRefs.forEach((line) => state.canvas.remove(line));
    state.canvas.remove(target);
  });
  state.canvas.discardActiveObject();
  state.canvas.requestRenderAll();
  pushHistory();
  status("Deleted");
}

function duplicateSelection() {
  const points = posePoints();
  if (!points.length) return;
  const shifted = points.slice(-18).map(([x, y]) => [Math.min(x + 24, state.canvas.getWidth()), Math.min(y + 24, state.canvas.getHeight())]);
  addPose(shifted);
  status("Duplicated");
}

function presets() {
  try {
    return JSON.parse(localStorage.getItem("openpose-editor-presets") || "{}");
  } catch (_) {
    return {};
  }
}

function writePresets(data) {
  localStorage.setItem("openpose-editor-presets", JSON.stringify(data));
}

function refreshPresets(selected = "") {
  const data = presets();
  const names = Object.keys(data).sort();
  ui.preset.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = names.length ? "Select preset" : "No presets";
  ui.preset.appendChild(empty);
  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    ui.preset.appendChild(option);
  });
  ui.preset.value = selected;
}

function savePreset() {
  const name = prompt("Preset name");
  if (!name) return;
  const data = presets();
  data[name] = JSON.parse(serializePose());
  writePresets(data);
  refreshPresets(name);
  status("Preset saved");
}

function loadPreset() {
  const name = ui.preset.value;
  if (!name) return;
  loadPoseJson(presets()[name]);
}

function bindEvents() {
  ui.resize.addEventListener("click", () => resizeCanvas(Number(ui.width.value), Number(ui.height.value)));
  ui.add.addEventListener("click", () => addPose());
  ui.reset.addEventListener("click", resetCanvas);
  ui.del.addEventListener("click", deleteSelection);
  ui.duplicate.addEventListener("click", duplicateSelection);
  ui.undo.addEventListener("click", undo);
  ui.redo.addEventListener("click", redo);
  ui.saveJson.addEventListener("click", saveJson);
  ui.savePng.addEventListener("click", savePng);
  ui.json.addEventListener("change", (event) => event.target.files[0] && readJsonFile(event.target.files[0]));
  ui.bg.addEventListener("change", (event) => event.target.files[0] && addBackground(event.target.files[0]));
  ui.savePreset.addEventListener("click", savePreset);
  ui.loadPreset.addEventListener("click", loadPreset);
  window.addEventListener("resize", fitCanvas);
  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      undo();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
    } else if (event.key === "Delete" || event.key === "Backspace") {
      deleteSelection();
    }
  });
  ui.stage.addEventListener("dragover", (event) => {
    event.preventDefault();
    ui.stage.classList.add("dragging");
  });
  ui.stage.addEventListener("dragleave", () => ui.stage.classList.remove("dragging"));
  ui.stage.addEventListener("drop", (event) => {
    event.preventDefault();
    ui.stage.classList.remove("dragging");
    const file = event.dataTransfer.files[0];
    if (!file) return;
    if (file.type.startsWith("image/")) addBackground(file);
    else readJsonFile(file);
  });
}

function init() {
  state.canvas = new fabric.Canvas("openpose_editor_canvas", {
    backgroundColor: "#000",
    preserveObjectStacking: true
  });
  state.canvas.on("object:moving", (event) => updateLines(event.target));
  state.canvas.on("object:scaling", (event) => updateLines(event.target));
  state.canvas.on("object:rotating", (event) => updateLines(event.target));
  state.canvas.on("object:modified", pushHistory);
  bindEvents();
  refreshPresets();
  addPose(defaultKeypoints, false);
  pushHistory();
  fitCanvas();
}

init();
