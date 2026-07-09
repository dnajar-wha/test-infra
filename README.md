# Nginx + HAProxy + Jenkins Load Balancing Lab

A hands-on learning environment for **cross-server load balancing** with automated CI/CD deployments.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Traffic Flow                                │
│                                                                     │
│                              User                                   │
│                               ↓                                     │
│                    ┌──────────────────┐                             │
│                    │   Nginx :80      │ (Optional reverse proxy)    │
│                    └────────┬─────────┘                             │
│                             ↓                                       │
│                    ┌──────────────────┐                             │
│                    │   HAProxy :80    │ (Load Balancer)             │
│                    │   Stats :8404    │                             │
│                    └────────┬─────────┘                             │
│           ┌─────────────────┴─────────────────┐                     │
│           ↓                                   ↓                     │
│  ┌─────────────────┐                 ┌─────────────────┐           │
│  │  Local Machine  │                 │   Remote VM     │           │
│  │  (Your Laptop)  │                 │ 192.168.139.128 │           │
│  │                 │                 │                 │           │
│  │   app1 :8081    │                 │   app2 :80      │           │
│  │   (Docker)      │                 │   (Docker)      │           │
│  └─────────────────┘                 └─────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         CI/CD Pipeline                              │
│                                                                     │
│  Git Push → Jenkins → Build Image → Deploy                          │
│                               ↓                                     │
│         ┌─────────────────────┴─────────────────────┐               │
│         ↓                                           ↓               │
│  app1: Local (port 8081)                    app2: VM (port 80)      │
│         docker run -p 8081:80               SSH + SCP + docker run  │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

| Component | Purpose | Port(s) |
|-----------|---------|---------|
| **Nginx** | Optional reverse proxy in front of HAProxy | 80 |
| **HAProxy** | Load balancer with health checks | 80, 8404 (stats) |
| **app1** | Application instance 1 (local) | 8081 |
| **app2** | Application instance 2 (VM) | 80 |
| **Jenkins** | CI/CD pipeline automation | 8081 (or 8082) |

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Application | http://localhost:80/ | - |
| HAProxy Stats | http://localhost:8404/stats | admin:ad*in123 |
| Jenkins | http://localhost:8081/ | - |
| App1 Direct | http://localhost:8081/ | - |
| App2 Direct | http://192.168.139.128/ | - |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git
- A remote VM (192.168.139.128) with:
  - Docker installed
  - SSH access for user `dnajar`
  - Port 80 open

### Initial Setup

1. **Clone and configure:**
   ```bash
   git clone <repository>
   cd nginx-haproxy-jenkins-lab
   
   # Copy environment file
   cp .env.example .env
   
   # Edit .env with your settings
   ```

2. **Generate SSH deploy key (if not exists):**
   ```bash
   ssh-keygen -t ed25519 -f jenkins/deploy-key -N "" -C "jenkins-deploy-key"
   ssh-copy-id -i jenkins/deploy-key.pub dnajar@192.168.139.128
   ```

3. **Start all services:**
   ```bash
   ./scripts/deploy.sh up
   # Or: docker compose up -d
   ```

4. **Copy SSH key to Jenkins (first time only):**
   ```bash
   docker exec jenkins mkdir -p /var/jenkins_home/.ssh
   docker cp jenkins/deploy-key jenkins:/var/jenkins_home/.ssh/deploy-key
   docker exec jenkins chown jenkins:jenkins /var/jenkins_home/.ssh/deploy-key
   docker exec jenkins chmod 600 /var/jenkins_home/.ssh/deploy-key
   ```

### Deploy via Jenkins

1. Push code to trigger the pipeline
2. Jenkins builds the Docker image
3. Deploys app1 locally (port 8081)
4. Deploys app2 to VM via SSH
5. HAProxy automatically load balances

### Manual Deploy

```bash
./scripts/deploy.sh rebuild
```

## Project Structure

```
nginx-haproxy-jenkins-lab/
├── docker-compose.yml      # Local stack orchestration
├── Jenkinsfile             # CI/CD pipeline definition
├── .env                    # Environment variables (gitignored)
├── .env.example            # Template for .env
├── .gitignore              # Git ignore rules
│
├── app/                    # Application source
│   ├── Dockerfile          # App container build
│   ├── nginx.conf          # Nginx config with /health endpoint
│   ├── index.html          # Main page
│   └── src/
│       └── app.js          # Dynamic content (date/time)
│
├── haproxy/                # HAProxy configuration
│   └── haproxy.cfg         # LB config with health checks
│
├── nginx/                  # Nginx reverse proxy config
│   └── nginx.conf          # Proxies to HAProxy
│
├── jenkins/                # Jenkins configuration
│   ├── Dockerfile          # Jenkins with Docker CLI + SSH
│   └── deploy-key          # SSH key for VM access (gitignored)
│
└── scripts/                # Helper scripts
    └── deploy.sh           # Start/stop/rebuild commands
```

## How It Works

### HAProxy Load Balancing

HAProxy uses **round-robin** balancing with health checks:

```haproxy
backend app_servers
    balance roundrobin
    option httpchk GET /health
    
    server app1 host.docker.internal:8081 check
    server app2 192.168.139.128:80 check
```

- `host.docker.internal` - Special DNS name that resolves to your laptop's IP from inside Docker
- `check` - HAProxy polls `/health` every 5 seconds
- `fall 3` - Mark DOWN after 3 failed checks
- `rise 2` - Mark UP after 2 successful checks

### Jenkins Pipeline Flow

```
1. Checkout code from Git
         ↓
2. Build Docker image (myapp:BUILDNUM-GITHASH)
         ↓
3. Export image to .tar file
         ↓
4. Deploy app1 locally: docker run -p 8081:80
         ↓
5. SCP image to VM + deploy app2: docker run -p 80:80
         ↓
6. Health check both instances
         ↓
7. Verify HAProxy routing
         ↓
8. Cleanup old images
```

### Cross-Server Networking

```
┌─────────────────────────────────────────────────────────┐
│ Network Path: HAProxy → app1 (local)                    │
│                                                         │
│ HAProxy (container)                                     │
│      ↓                                                  │
│ host.docker.internal:8081 (Docker host networking)      │
│      ↓                                                  │
│ app1 container port 80                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Network Path: HAProxy → app2 (VM)                       │
│                                                         │
│ HAProxy (container)                                     │
│      ↓                                                  │
│ 192.168.139.128:80 (VM network - same subnet)           │
│      ↓                                                  │
│ app2 container port 80                                  │
└─────────────────────────────────────────────────────────┘
```

## Troubleshooting

### App1 Not Responding

```bash
# Check container status
docker ps -a --filter name=app1

# View logs
docker logs app1 --tail 30

# Test health endpoint
curl http://localhost:8081/health

# Check port binding
docker ps --filter name=app1 --format "{{.Ports}}"
```

**Common issue:** Port 8081 already in use
```bash
# Find what's using port 8081
netstat -ano | findstr :8081

# Kill the process or use a different port
```

### App2 Not Responding

```bash
# SSH to VM
ssh dnajar@192.168.139.128

# Check container on VM
docker ps -a --filter name=app2
docker logs app2 --tail 30

# Test locally on VM
curl http://localhost:80/health
```

**Common issue:** SSH key not configured in Jenkins
```bash
# Copy key to Jenkins
docker exec jenkins mkdir -p /var/jenkins_home/.ssh
docker cp jenkins/deploy-key jenkins:/var/jenkins_home/.ssh/deploy-key
docker exec jenkins chown jenkins:jenkins /var/jenkins_home/.ssh/deploy-key
docker exec jenkins chmod 600 /var/jenkins_home/.ssh/deploy-key
```

### HAProxy Can't Reach Backends

```bash
# Check HAProxy config
docker exec haproxy cat /usr/local/etc/haproxy/haproxy.cfg

# View HAProxy logs
docker logs haproxy --tail 50

# Test backend connectivity
docker exec haproxy curl -v http://host.docker.internal:8081/health
```

### Jenkins Build Fails

```bash
# View Jenkins logs
docker logs jenkins --tail 100

# Check SSH connectivity from Jenkins
docker exec jenkins ssh -i /var/jenkins_home/.ssh/deploy-key \
  -o StrictHostKeyChecking=no dnajar@192.168.139.128 "echo success"
```

### Port Conflicts

| Port | Used By | Fix |
|------|---------|-----|
| 80 | Nginx/Haproxy | Change nginx port in docker-compose.yml |
| 8080 | Nginx | Change to 8089 in docker-compose.yml |
| 8081 | Jenkins OR app1 | Move Jenkins to 8082 |
| 8404 | HAProxy stats | Usually free |

## Learning Exercises

### 1. Test Failover

```bash
# Stop app2 on VM
ssh dnajar@192.168.139.128 "docker stop app2"

# Watch HAProxy stats - app2 goes DOWN
# Refresh http://localhost:80/ - should still work (app1)

# Restart app2
ssh dnajar@192.168.139.128 "docker start app2"
```

### 2. Test Load Distribution

```bash
# Hit the load balancer 10 times
1..10 | ForEach-Object { curl -s http://localhost:80/ | Select-String "Version" }

# Check HAProxy stats for request distribution
```

### 3. Add a Third Backend

```bash
# Start app3 locally on different port
docker run -d --name app3 -p 8082:80 myapp:latest

# Add to HAProxy config
# server app3 host.docker.internal:8082 check

# Restart HAProxy
docker restart haproxy
```

### 4. Blue-Green Deploy

```bash
# Deploy new version to app1 only
docker build -t myapp:v2 ./app
docker stop app1 && docker rm app1
docker run -d --name app1 -p 8081:80 myapp:v2

# Verify app1 works
curl http://localhost:8081/

# If good, deploy to app2 via Jenkins
# If bad, rollback app1
```

## Security Considerations

| Issue | Current State | Production Fix |
|-------|---------------|----------------|
| SSH Key | Stored in Jenkins volume | Use Jenkins credentials store |
| HAProxy Auth | Plaintext in config | Use env vars or secrets |
| Docker Socket | Mounted in Jenkins | Use Docker-in-Docker or rootless |
| Network | All containers can talk | Use isolated networks |
| No TLS | HTTP only | Add SSL termination |

## Cleanup

```bash
# Stop all services
./scripts/deploy.sh down

# Remove everything (including volumes)
./scripts/deploy.sh clean

# Remove from VM
ssh dnajar@192.168.139.128 "docker rm -f app2 && docker rmi myapp:latest"
```

## References

- [HAProxy Documentation](https://www.haproxy.org/documentation/)
- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Docker Networking](https://docs.docker.com/network/)
- [SSH Key Authentication](https://www.ssh.com/academy/ssh/public-key-authentication)
