# Office Linux Database Access Runbook (§25)

**Target Audience**: Office staff, founders, data analysts, and developers working on Linux workstations (Ubuntu, Debian, Fedora, Arch Linux, Linux Mint).  
**Database**: PostgreSQL (AWS RDS / VPC Staging & Production Cluster)  
**Access Tier**: Least-privilege Read-Only Analytics & Administrative Tunnels  

---

## 1. Architecture Overview

```
+---------------------------+          +------------------------+          +---------------------------+
| Office Linux Workstation  |  SSH     |  AWS Bastion Host      |  VPC     |  AWS RDS PostgreSQL       |
| (DBeaver / TablePlus /    | =======> |  (EC2 / Staging Node)   | =======> |  Port 5432 (Internal)     |
|  Metabase / psql)         |  Port 22 |  networkpeer-bastion   |          |  networkpeer-db-staging   |
+---------------------------+          +------------------------+          +---------------------------+
  Connects to localhost:5433             Forwarding localhost:5433 -> db:5432
```

Because the PostgreSQL database resides in a private VPC subnet without public IP exposure, all connections from outside the VPC must traverse an encrypted **SSH local port forwarding tunnel**.

---

## 2. Recommended Database Clients for Linux

### Option A: DBeaver Community (Recommended for Analysts & Founders)
DBeaver is a powerful, free, universal database GUI that handles SSH tunnels natively.

- **Installation (Ubuntu / Debian / Mint)**:
  ```bash
  sudo snap install dbeaver-ce
  # OR via APT:
  sudo add-apt-repository ppa:serge-rider/dbeaver-ce -y
  sudo apt update && sudo apt install dbeaver-ce -y
  ```
- **Installation (Fedora / RHEL)**:
  ```bash
  sudo flatpak install flathub io.dbeaver.DBeaverCommunity
  ```

### Option B: TablePlus (Modern, Lightweight UI)
- **Installation (Debian / Ubuntu)**:
  ```bash
  # Add TablePlus GPG key and repo
  wget -qO - https://deb.tableplus.com/apt.key | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/tableplus.gpg > /dev/null
  sudo add-apt-repository "deb [arch=amd64] https://deb.tableplus.com/debian/tableplus tableplus main"
  sudo apt update && sudo apt install tableplus -y
  ```

### Option C: `psql` CLI (Fast Terminal Access)
- **Installation**:
  ```bash
  sudo apt install postgresql-client -y # Debian/Ubuntu
  sudo dnf install postgresql -y        # Fedora
  ```

---

## 3. Establishing the SSH Tunnel

### Step 3.1: SSH Key Setup
Ensure your private key has strict POSIX permissions:
```bash
chmod 600 ~/.ssh/networkpeer_bastion_key.pem
```

### Step 3.2: Configure SSH Host Shortcut (`~/.ssh/config`)
Add the following configuration to `~/.ssh/config`:
```ssh-config
Host networkpeer-bastion
    HostName ec2-13-53-128-44.eu-north-1.compute.amazonaws.com
    User ubuntu
    IdentityFile ~/.ssh/networkpeer_bastion_key.pem
    ServerAliveInterval 60
    ServerAliveCountMax 3
    LocalForward 5433 networkpeer-staging-db.c7x8y9z0.eu-north-1.rds.amazonaws.com:5432
```

### Step 3.3: Launching the Tunnel (One-Liner)
Run:
```bash
ssh -N networkpeer-bastion
```
*(The `-N` flag tells SSH not to execute a remote shell, keeping the tunnel open silently in the background).*

---

## 4. Persistent Auto-Reconnecting Tunnel (Systemd Service)

To keep the database tunnel automatically connected on your office Linux workstation without needing a manual terminal:

1. Create `/etc/systemd/system/networkpeer-db-tunnel.service`:
```ini
[Unit]
Description=NetworkPeer PostgreSQL SSH Tunnel
After=network.target

[Service]
User=aditya
ExecStart=/usr/bin/ssh -NT -o ServerAliveInterval=60 -o ExitOnForwardFailure=yes -L 5433:networkpeer-staging-db.c7x8y9z0.eu-north-1.rds.amazonaws.com:5432 ubuntu@ec2-13-53-128-44.eu-north-1.compute.amazonaws.com -i /home/aditya/.ssh/networkpeer_bastion_key.pem
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable networkpeer-db-tunnel
sudo systemctl start networkpeer-db-tunnel
sudo systemctl status networkpeer-db-tunnel
```

---

## 5. Least-Privilege Read-Only User Setup

To prevent accidental data alterations or destructive drops, data analysts and office workstations must connect using a dedicated read-only role:

```sql
-- Run as superuser/admin on staging PostgreSQL:
CREATE ROLE networkpeer_readonly WITH LOGIN PASSWORD 'SecuredReadOnlyPass2026!';
GRANT CONNECT ON DATABASE networkpeer_staging TO networkpeer_readonly;
GRANT USAGE ON SCHEMA public TO networkpeer_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO networkpeer_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO networkpeer_readonly;
```

---

## 6. Connecting via DBeaver / TablePlus

Configure your connection settings in your GUI tool:

| Parameter | Value |
| :--- | :--- |
| **Host** | `127.0.0.1` (or `localhost`) |
| **Port** | `5433` (maps through tunnel to RDS 5432) |
| **Database** | `networkpeer_staging` |
| **Username** | `networkpeer_readonly` (or admin account) |
| **Password** | *(As provisioned above)* |
| **SSL Mode** | `prefer` or `require` |

Test connection: Click **Test Connection** in DBeaver/TablePlus -> Status should display `Connected (PostgreSQL 16.x)`.

---

## 7. Useful Diagnostic Queries for Founders & Analysts

### A. Monitor Unfunded vs. Funded Jobs
```sql
SELECT 
    id, 
    title, 
    status, 
    funding_status, 
    (budget_cents / 100.0) AS budget_inr, 
    created_at 
FROM jobs 
ORDER BY created_at DESC 
LIMIT 25;
```

### B. Worker Review Queue & Correctionist Eligibility
```sql
SELECT 
    u.id AS user_id,
    u.full_name,
    u.email,
    u.mobile_number,
    wp.is_available,
    wp.eligible_roles
FROM users u
LEFT JOIN worker_profiles wp ON u.id = wp.user_id
WHERE u.role = 'WORKER';
```

### C. Evidence Quality & OCR Verification Audit
```sql
SELECT 
    sub.id,
    sub.job_id,
    sub.status,
    sub.ocr_confidence,
    sub.detected_script,
    sub.created_at
FROM submissions sub
ORDER BY sub.created_at DESC
LIMIT 50;
```

---

## 8. Troubleshooting Common Linux Workstation Issues

1. **Error: `bind: Address already in use`**:
   - Cause: Another process or previous tunnel is bound to port `5433`.
   - Fix:
     ```bash
     sudo lsof -i :5433
     kill -9 <PID>
     ```
2. **Error: `Permissions 0644 for id_rsa are too open`**:
   - Fix: `chmod 600 ~/.ssh/networkpeer_bastion_key.pem`
3. **Local PostgreSQL collision on 5432**:
   - Always map the local tunnel port to `5433` instead of `5432` to avoid conflicts if a local PostgreSQL daemon is installed on your Linux machine.
