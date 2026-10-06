import os
import sys
import paramiko

# Credentials
HOST = "185.226.232.121"
USER = "algomasqueluz"
PASS = "eA9Drxb?oUe76~jx"

LOCAL_DIR = "/Users/hugogon15/CRM AMQL/whatsapp-service"
REMOTE_DIR = "/home/algomasqueluz/whatsapp-service"

def sftp_upload_dir(sftp, local_path, remote_path):
    print(f"Creating remote dir: {remote_path}")
    try:
        sftp.mkdir(remote_path)
    except IOError:
        # Directory might already exist
        pass

    for item in os.listdir(local_path):
        local_item = os.path.join(local_path, item)
        remote_item = os.path.join(remote_path, item)
        if os.path.isdir(local_item):
            if item == "node_modules" or item == "auth_info":
                continue # Skip node_modules and session info
            sftp_upload_dir(sftp, local_item, remote_item)
        else:
            print(f"Uploading file: {local_item} -> {remote_item}")
            sftp.put(local_item, remote_item)

def execute_sudo_cmd(ssh, cmd, password):
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    
    # Wait a tiny bit and send password if prompted
    import time
    time.sleep(0.5)
    
    # Send password to sudo prompt
    stdin.write(password + '\n')
    stdin.flush()
    
    output = stdout.read().decode('utf-8')
    err_out = stderr.read().decode('utf-8')
    
    print("--- Output ---")
    print(output)
    if err_out:
        print("--- Error ---")
        print(err_out)
    return output

def main():
    print("Connecting to VPS via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASS, timeout=15)
        print("✅ Connected successfully via SSH!")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)

    # SFTP upload
    print("Starting file upload via SFTP...")
    sftp = ssh.open_sftp()
    try:
        sftp_upload_dir(sftp, LOCAL_DIR, REMOTE_DIR)
        print("✅ File upload completed!")
    except Exception as e:
        print(f"❌ File upload failed: {e}")
        sftp.close()
        ssh.close()
        sys.exit(1)
    sftp.close()

    # Install dependencies
    print("\nInstalling Node dependencies...")
    stdin, stdout, stderr = ssh.exec_command(f"cd {REMOTE_DIR} && npm install")
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))

    # Configure service file and firewall
    print("\nConfiguring systemd service...")
    execute_sudo_cmd(ssh, f"sudo cp {REMOTE_DIR}/whatsapp-service.service /etc/systemd/system/", PASS)
    execute_sudo_cmd(ssh, "sudo systemctl daemon-reload", PASS)
    execute_sudo_cmd(ssh, "sudo systemctl restart whatsapp-service", PASS)
    execute_sudo_cmd(ssh, "sudo systemctl enable whatsapp-service", PASS)

    # Check status
    print("\nChecking service status...")
    status_out = execute_sudo_cmd(ssh, "sudo systemctl status whatsapp-service --no-pager", PASS)

    # Open firewall port 8002
    print("\nOpening firewall port 8002...")
    # Try ufw first
    ufw_res = execute_sudo_cmd(ssh, "sudo ufw allow 8002/tcp", PASS)
    if "command not found" in ufw_res.lower() or "not enabled" in ufw_res.lower():
        # Try firewall-cmd
        execute_sudo_cmd(ssh, "sudo firewall-cmd --zone=public --add-port=8002/tcp --permanent", PASS)
        execute_sudo_cmd(ssh, "sudo firewall-cmd --reload", PASS)

    # Check ports listening
    print("\nChecking listening ports...")
    execute_sudo_cmd(ssh, "sudo ss -tuln | grep 8002", PASS)

    ssh.close()
    print("\n🎉 ALL DONE!")

if __name__ == "__main__":
    main()
