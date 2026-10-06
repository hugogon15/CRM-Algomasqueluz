import paramiko

HOST = "185.226.232.121"
USER = "algomasqueluz"
PASS = "wOAF2orih*^if2c1"

def execute_sudo_cmd(ssh, cmd, password):
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    import time
    time.sleep(0.5)
    stdin.write(password + '\n')
    stdin.flush()
    output = stdout.read().decode('utf-8')
    print("Output:", output)
    return output

def main():
    print("Connecting to VPS to open port 8002...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASS, timeout=10)
        print("Connected!")
        
        # Try ufw first
        print("\nTrying to open port using ufw...")
        res = execute_sudo_cmd(ssh, "sudo ufw allow 8002/tcp", PASS)
        
        # If ufw didn't work or not installed, try firewall-cmd (CentOS/Plesk)
        if "command not found" in res.lower() or "not enabled" in res.lower():
            print("\nTrying to open port using firewall-cmd...")
            execute_sudo_cmd(ssh, "sudo firewall-cmd --zone=public --add-port=8002/tcp --permanent", PASS)
            execute_sudo_cmd(ssh, "sudo firewall-cmd --reload", PASS)
            
        print("\nChecking firewall status...")
        execute_sudo_cmd(ssh, "sudo ufw status", PASS)
        execute_sudo_cmd(ssh, "sudo firewall-cmd --list-ports", PASS)
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
