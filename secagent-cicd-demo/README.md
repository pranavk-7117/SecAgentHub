# 🛡️ SecAgent CI/CD Demo Repository (`secagent-cicd-demo`)

This repository demonstrates the **SecAgent Pre-Deployment Cloud Security Gate** in action with real GitHub Pull Requests.

---

## 🎯 The Hackathon Demo Narrative

1. **Baseline**: `main` contains a secure baseline Terraform infrastructure (private VPC, restricted SSH, encrypted database).
2. **Adversarial Change**: A developer opens a Pull Request (`feature/insecure-change`) adding a public security group (`0.0.0.0/0:22`) and a wildcard IAM role (`Action: *`, `Resource: *`).
3. **Automated Analysis**: GitHub Actions triggers the SecAgent Hub Security Gate (`POST /api/v1/cicd/security-gate`).
4. **Digital Twin & Attack Graph**: SecAgent generates the Infrastructure Digital Twin and discovers an adversarial attack path:
   $$\text{Internet} \longrightarrow \text{Public SG} \longrightarrow \text{EC2} \longrightarrow \text{IAM Role} \longrightarrow \text{Production RDS}$$
5. **Enforcement**: GitHub Action **BLOCKS** the Pull Request (Exit code 1).
6. **Remediation & Proof-of-Fix**: The developer opens the link in SecAgent Hub, simulates the fix in the Digital Twin, verifies the AI patch, and pushes the fix.
7. **Passing Gate**: The updated PR automatically runs again and **PASSES** (Exit code 0).

---

## 🚀 Live Demo Setup (3 Minutes)

### Step 1: Create a GitHub Repository
1. Create a new GitHub repo named `secagent-cicd-demo`.
2. Push `main.tf` and `.github/workflows/secagent-security.yml` to the `main` branch.

### Step 2: Configure GitHub Repository Secret
In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**
- **Name**: `SECAGENT_API_URL`
- **Value**: Your deployed SecAgent Hub URL (e.g. `https://secagent-api.up.railway.app` or `https://your-domain.com` or local tunnel like Ngrok)

### Step 3: Trigger the Blocked PR Demo
```bash
git checkout -b feature/insecure-change
cat insecure-change.tf >> main.tf
git commit -am "feat: add web server and admin role"
git push origin feature/insecure-change
```
Open a Pull Request on GitHub to `main`.
- Watch GitHub Actions execute:
  - 🛑 **SecAgent Security Gate: BLOCKED**
  - **Critical Attack Path Identified**: `Internet → Public SG → EC2 → IAM → RDS`
  - Direct link to inspect in **SecAgent Digital Twin Canvas**.

### Step 4: Fix and Pass Demo
```bash
# Restrict the security group back to 10.0.0.0/16 and scope the IAM policy
git checkout feature/insecure-change
# Apply the secure fix from SecAgent Hub
git commit -am "fix(security): restrict ingress to 10.0.0.0/16 and scope IAM actions"
git push origin feature/insecure-change
```
- Watch GitHub Actions run again:
  - ✅ **SecAgent Security Gate: PASSED**
  - **Verdict**: Merge allowed!
