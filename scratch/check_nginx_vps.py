import paramiko

HOST = "185.226.232.121"
USER = "algomasqueluz"
PASS = "wOAF2orih*^if2c1"

def main():
    print("Connecting to VPS to check Nginx configuration...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASS, timeout=10)
        print("Connected!")
        
        # Let's list files in Nginx vhosts directory or search configuration files
        # Plesk stores configurations under /etc/nginx/conf.d/ or /etc/nginx/systemd/
        # Let's do a search for algomasqueluz configurations in Nginx
        stdin, stdout, stderr = ssh.exec_command("find /etc/nginx -name '*algomasqueluz*' -type f")
        print("Nginx files:")
        files = stdout.read().decode('utf-8')
        print(files)
        
        # Let's run a check to see Nginx running configurations
        stdin, stdout, stderr = ssh.exec_command("ps aux | grep nginx")
        print("\nNginx process check:")
        print(stdout.read().decode('utf-8'))
        
        # Let's read Plesk domains configuration
        stdin, stdout, stderr = ssh.exec_command("sudo cat /etc/hosts 2>/dev/null || cat /etc/hosts")
        print("\nHosts file:")
        print(stdout.read().decode('utf-8'))
        
    except Exception as e:
        print(f"Error checking Nginx: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
