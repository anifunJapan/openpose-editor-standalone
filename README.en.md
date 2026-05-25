# OpenPose Editor Standalone

[日本語](README.md) | English

![screenshot](images/screenshot-main.png)

Lightweight OpenPose / ControlNet JSON compatible pose editor.

Runs entirely in the browser without AUTOMATIC1111, Gradio, or Electron.

Designed for simple and lightweight pose editing workflows for Stable Diffusion / ControlNet.

---

## Features

- Add / Move / Rotate / Scale poses
- OpenPose / ControlNet JSON import & export
- PNG export
- Background image support
- Undo / Redo
- Duplicate / Delete
- Drag & Drop support
- Browser preset saving
- Lightweight standalone workflow
- Runs with Python standard library only

---

## Start (Windows)

Python 3 is required.

Double click:

```text
start.bat
```

If the browser does not open automatically:

```text
http://127.0.0.1:7865/
```

---

## Manual Start

```bash
python standalone_server.py
```

---

## Supported Formats

- OpenPose JSON
- ControlNet OpenPose JSON
- PNG export

---

## Not Included

This project does NOT include:

- CMU OpenPose
- OpenPose binaries
- Caffe
- AI pose detection models
- AUTOMATIC1111
- ControlNet backend
- pose detection (image-to-pose generation)

This project is a lightweight standalone editor for:

```text
Pose editing
JSON editing
```

It does NOT perform:

```text
Image → AI pose detection
```

---

## Why?

The original openpose-editor ecosystem often depends on:

- AUTOMATIC1111
- older Gradio environments
- unstable extension tabs
- complicated setup

This project was rebuilt with focus on:

```text
Lightweight
Standalone
Simple
```

---

## License

MIT License based.

Some repository files may include Apache-2.0 licensed code derived from ControlNet.

See:

- LICENSE
- THIRD_PARTY_NOTICES.md

for details.

---

## Original Project

Original project:

- fkunn1326/openpose-editor

ControlNet ecosystem compatibility inspired by:

- lllyasviel/ControlNet

---

## Roadmap

Planned future features:

- image-to-pose generation
- MediaPipe Pose support
- hand pose support
- improved OpenPose JSON compatibility

---

## Notes

This standalone version is designed as a lightweight alternative editor for the AUTOMATIC1111 extension workflow.

Therefore, features such as:

- AI inference
- pose detection
- direct ControlNet sending

are intentionally NOT included.

---

## Thanks

Thanks to OpenPose / ControlNet / Stable Diffusion ecosystem developers.