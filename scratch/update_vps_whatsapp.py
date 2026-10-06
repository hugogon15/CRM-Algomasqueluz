import paramiko
import time

HOST = "185.226.232.121"
USER = "algomasqueluz"
PASS = "wOAF2orih*^if2c1"

LOCAL_FILE = "/Users/hugogon15/CRM AMQL/whatsapp-service/index.js"
REMOTE_FILE = "/var/www/vhosts/algomasqueluz.com/whatsapp-service/index.js"
LOG_FILE = "/var/www/vhosts/algomasqueluz.com/whatsapp-service/whatsapp.log"
DIR_PATH = "/var/www/vhosts/algomasqueluz.com/whatsapp-service"

def main():
    print("Connecting to VPS via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASS, timeout=10)
        print("✅ Connected!")
        
        # Upload index.js
        print("Uploading updated index.js via SFTP...")
        sftp = ssh.open_sftp()
        sftp.put(LOCAL_FILE, REMOTE_FILE)
        sftp.close()
        print("✅ File uploaded!")
        
        # Find and kill the old process
        print("Killing old Node.js whatsapp-service process...")
        # Get list of node processes
        stdin, stdout, stderr = ssh.exec_command("ps aux | grep node")
        ps_output = stdout.read().decode('utf-8')
        for line in ps_output.split('\n'):
            if 'node index.js' in line:
                parts = line.split()
                if len(parts) > 1:
                    pid = parts[1]
                    print(f"Killing PID {pid}...")
                    ssh.exec_command(f"kill -9 {pid}")
        
        # In case it wasn't running, run killall or clean up logs
        ssh.exec_command(f"rm -f {LOG_FILE}")
        time.sleep(1)
        
        # Start the new process
        print("Starting Node.js WhatsApp microservice in the background...")
        start_cmd = f"cd {DIR_PATH} && nodenv local 22 && nohup /var/www/vhosts/algomasqueluz.com/.nodenv/shims/node index.js > whatsapp.log 2>&1 &"
        ssh.exec_command(start_cmd)
        
        # Wait for initialization
        print("Waiting 6 seconds for initialization...")
        time.sleep(6)
        
        # Print logs
        print("\n--- Reading whatsapp.log ---")
        stdin, stdout, stderr = ssh.exec_command(f"cat {LOG_FILE}")
        print(stdout.read().decode('utf-8'))
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
