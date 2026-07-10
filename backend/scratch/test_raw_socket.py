import socket
import ssl
import struct

host = "ep-soft-fog-apo5qj7w.us-east-1.aws.neon.tech"
port = 5432

def test_raw():
    print(f"Connecting to {host}:{port}...", flush=True)
    try:
        s = socket.create_connection((host, port), timeout=5)
        print("TCP socket connected successfully!", flush=True)
        
        # PostgreSQL SSL request packet: 8 bytes
        # Length (4 bytes) = 8
        # Code (4 bytes) = 80877103 (0x04D22D2F)
        ssl_req = struct.pack("!II", 8, 80877103)
        s.sendall(ssl_req)
        print("Sent PostgreSQL SSL request packet.", flush=True)
        
        # Read 1 byte response
        resp = s.recv(1)
        if not resp:
            print("Received empty response (connection closed by server).", flush=True)
            return
            
        print(f"Received response byte: {resp} (char: {chr(resp[0]) if resp else ''})", flush=True)
        
        if resp == b'S':
            print("Server supports SSL! Attempting raw SSL handshake...", flush=True)
            # Wrap the socket in SSL
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            
            ssl_sock = context.wrap_socket(s, server_hostname=host)
            print("SSL Handshake SUCCEEDED! Cipher used:", ssl_sock.cipher(), flush=True)
            ssl_sock.close()
        else:
            print("Server does not support SSL.", flush=True)
            s.close()
            
    except Exception as e:
        print("Raw connection failed!", flush=True)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_raw()
