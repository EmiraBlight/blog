import hashlib
import http.server
import socketserver
import ssl
from pathlib import Path

# --- Configuration ---
# Use port 443 for standard HTTPS, 8443 for non-standard
PORT = 8443
CERT_FILE = "/etc/letsencrypt/live/srv915664.hstgr.cloud/cert.pem"  # FILL THIS IN
KEY_FILE = "/etc/letsencrypt/live/srv915664.hstgr.cloud/privkey.pem"  # FILL THIS I
JSON_FILE_PATH = Path(__file__).resolve().parent.parent / "public" / "blogs.json"


class BlogServer(http.server.SimpleHTTPRequestHandler):
    # This method handles the preflight request sent by the browser
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers", "X-Requested-With, Content-type"
        )
        self.end_headers()

    def do_GET(self):
        if self.path == "/blogs.json":
            try:
                # Read the file content
                with open(JSON_FILE_PATH, "rb") as f:
                    content = f.read()

                # Calculate ETag
                etag = f'"{hashlib.md5(content).hexdigest()}"'

                # Check if the client's cached version is still valid
                if (
                    "if-none-match" in self.headers
                    and self.headers["if-none-match"] == etag
                ):
                    self.send_response(304)  # Not Modified
                    self.send_header(
                        "Access-Control-Allow-Origin", "*"
                    )  # CORS headers are needed even for 304
                    self.send_header("ETag", etag)
                    self.end_headers()
                    return

                # If content is new or not cached, send the full response
                self.send_response(200)
                # Send all headers
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("ETag", etag)
                self.end_headers()
                # Write the content
                self.wfile.write(content)

            except FileNotFoundError:
                self.send_response(404)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(b'{"error": "blogs.json not found"}')
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(
                    f'{{"error": "Internal server error: {str(e)}"}}'.encode()
                )
        else:
            # Fallback for any other route
            self.send_response(404)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"error": "Not Found"}')


with socketserver.TCPServer(("", PORT), BlogServer) as httpd:
    # Create a modern SSL context, which is more secure and compatible
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)

    # Load your certificate and private key into the context
    context.load_cert_chain(certfile=CERT_FILE, keyfile=KEY_FILE)

    # Wrap the server's socket with the configured SSL context
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

    print(f"Serving securely on port {PORT}")
    print(f"API endpoint: https://localhost:{PORT}/blogs.json")
    httpd.serve_forever()
