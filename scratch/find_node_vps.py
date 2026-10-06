import paramiko

HOST = "185.226.232.121"
USER = "algomasqueluz"
PASS = "wOAF2orih*^if2c1"

def main():
    print("Connecting to VPS to find node path...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASS, timeout=10)
        print("Connected!")
        
        # Let's run a login shell to find where node is
        stdin, stdout, stderr = ssh.exec_command("bash -lc 'which node'")
        print("which node (login shell):", stdout.read().decode('utf-8').strip())
        
        # Let's check where nodenv stores versions
        stdin, stdout, stderr = ssh.exec_command("find ~ -name node -type f")
        print("\nNode binaries in home:")
        print(stdout.read().decode('utf-8'))
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
