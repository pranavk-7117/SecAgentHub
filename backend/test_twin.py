import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

# We assume a scan is already created or we'll create one using the insecure-main.tf file
with open("../examples/insecure-main.tf", "rb") as f:
    files = {"file": ("insecure-main.tf", f, "application/octet-stream")}
    res = requests.post(f"{BASE_URL}/scan/upload", files=files, headers={"Authorization": "Bearer fake"})
    if res.status_code != 200:
        print("Upload failed:", res.text)
        exit(1)
    scan_id = res.json()["scan_id"]
    print("Scan ID:", scan_id)

print("\n--- 1. Build Twin ---")
res = requests.post(f"{BASE_URL}/twin/build", json={"scan_id": scan_id}, headers={"Authorization": "Bearer fake"})
print(res.status_code)
twin_data = res.json()
print("Twin ID:", twin_data.get("id"))
print("Public Exposures:", twin_data.get("public_exposures"))
twin_id = twin_data.get("id")

print("\n--- 2. Get Attack Paths ---")
res = requests.get(f"{BASE_URL}/twin/{twin_id}/attack-paths", headers={"Authorization": "Bearer fake"})
print(res.status_code, "Count:", res.json().get("count"))

print("\n--- 3. Simulate Mutation ---")
res = requests.post(f"{BASE_URL}/twin/{twin_id}/simulate", json={"mutation_type": "public_access_private"}, headers={"Authorization": "Bearer fake"})
sim_twin = res.json()
print(res.status_code)
sim_id = sim_twin.get("id")
print("Simulated Twin ID:", sim_id)
print("Public Exposures After:", sim_twin.get("public_exposures"))

print("\n--- 4. Compare Twins ---")
res = requests.post(f"{BASE_URL}/twin/{twin_id}/compare", json={"twin_id_after": sim_id}, headers={"Authorization": "Bearer fake"})
print(res.status_code)
print(json.dumps(res.json(), indent=2))

print("\n--- 5. Optimize Remediation ---")
res = requests.post(f"{BASE_URL}/twin/{twin_id}/optimize", headers={"Authorization": "Bearer fake"})
print(res.status_code)
print(json.dumps(res.json(), indent=2))
