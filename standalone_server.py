from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).parent
STANDALONE = ROOT / "standalone"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        clean_path = path.split("?", 1)[0].split("#", 1)[0]
        if clean_path in ("", "/"):
            return str(STANDALONE / "index.html")
        if clean_path in ("/style.css", "/standalone.js"):
            return str(STANDALONE / clean_path.lstrip("/"))
        return super().translate_path(path)


def main():
    host = "127.0.0.1"
    port = 7865
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"OpenPose Editor standalone: http://{host}:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
