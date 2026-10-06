import paramiko

HOST = "185.226.232.121"
USER = "algomasqueluz"
PASS = "wOAF2orih*^if2c1"

def main():
    print("Connecting to VPS to check logs...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASS, timeout=10)
        print("Connected! Reading log file...")
        stdin, stdout, stderr = ssh.exec_command("cat /var/www/vhosts/algomasqueluz.com/whatsapp-service/whatsapp.log")
        log_content = stdout.read().decode('utf-8')
        err_content = stderr.read().decode('utf-8')
        
        print("\n--- whatsapp.log content ---")
        print(log_content)
        
        if err_content:
            print("\n--- error output ---")
            print(err_content)
            
        print("\nChecking if process is running...")
        stdin, stdout, stderr = ssh.exec_command("ps aux | grep node")
        print(stdout.read().decode('utf-8'))
        
    except Exception as e:
        print(f"Error checking logs: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
