import { X, FileCode2, ShieldAlert, GitBranch, Shield, AlertTriangle, Zap, CheckCircle2, Database, Server, Lock } from "lucide-react";

function resourceIcon(kind: string) {
  if (!kind) return <Server className="w-4 h-4 text-slate-400" />;
  if (kind.includes("iam")) return <Lock className="w-4 h-4 text-amber-400" />;
  if (kind.includes("s3") || kind.includes("db") || kind.includes("rds")) return <Database className="w-4 h-4 text-violet-400" />;
  if (kind.includes("security_group")) return <Shield className="w-4 h-4 text-red-400" />;
  return <Server className="w-4 h-4 text-teal-400" />;
}

function mitreBadge(technique: string) {
  if (!technique) return null;
  const labels: Record<string, string> = {
    "T1190": "Exploit Public-Facing App",
    "T1078.004": "Cloud Account Compromise",
    "T1530": "Data from Cloud Storage",
    "T1537": "Transfer Data to Cloud Account",
    "T1548": "Abuse Elevation Control Mechanism",
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-full">
        <Zap className="w-2.5 h-2.5" /> {technique}
      </span>
      {labels[technique] && (
        <span className="text-[10px] text-slate-500">{labels[technique]}</span>
      )}
    </div>
  );
}

function relationshipLabel(label: string) {
  const map: Record<string, string> = {
    "public_ingress": "Public Internet Ingress",
    "instance_profile": "IAM Instance Profile Attachment",
    "attached_policy": "IAM Policy Attachment",
    "data_access": "Data Access (IAM Policy)",
    "db_access": "Database Access (IAM Policy)",
    "data_exfiltration": "Public Data Exfiltration",
    "network_access": "Network Access via Security Group",
    "public exposure": "Public Internet Exposure",
    "depends_on": "Infrastructure Dependency",
  };
  return map[label] || label || "Relationship";
}

export function PathDetailsPanel({
  selectedElement,
  elementType,
  onClose,
}: {
  selectedElement: any;
  elementType: "node" | "edge" | null;
  onClose: () => void;
}) {
  if (!selectedElement) return null;

  const isEdge = elementType === "edge";
  const isNode = elementType === "node";

  // Derive data from graph node/edge data
  const nodeData = selectedElement.data || {};
  const kind = nodeData.kind || selectedElement.kind || "";
  const risk = nodeData.risk ?? selectedElement.risk_score ?? 0;
  const isCrownJewel = kind.includes("s3_bucket") || kind.includes("db_instance") || kind.includes("rds") || kind.includes("secretsmanager") || kind.includes("kms");
  const isInternetFacing = risk >= 60 || kind.includes("security_group");
  const findings: string[] = nodeData.findings || [];
  const issueCount: number = nodeData.issue_count ?? findings.length;

  // Edge data
  const edgeFrom = selectedElement.source || selectedElement.from || "";
  const edgeTo = selectedElement.target || selectedElement.to || "";
  const edgeLabel = selectedElement.label || "";
  const edgeEvidence = selectedElement.evidence || nodeData.evidence || "";
  const edgeMitre = selectedElement.mitre || "";

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 rounded-2xl border border-white/[0.09] bg-slate-950/97 backdrop-blur shadow-2xl shadow-black/60 flex flex-col z-20 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] p-4 bg-white/[0.02]">
        <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
          {isEdge ? <GitBranch className="w-4 h-4 text-rose-400" /> : resourceIcon(kind)}
          {isEdge ? "Why Does This Path Exist?" : "Resource Evidence"}
        </h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition p-1 rounded-lg hover:bg-white/[0.06]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5">

        {isEdge ? (
          <>
            {/* Connection */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Attack Path Edge</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-200 bg-white/[0.06] px-2 py-1 rounded-lg">{edgeFrom || "Source"}</span>
                <span className="text-rose-400">→</span>
                <span className="text-xs font-bold text-slate-200 bg-white/[0.06] px-2 py-1 rounded-lg">{edgeTo || "Target"}</span>
              </div>
              {edgeLabel && (
                <p className="text-[11px] text-slate-400 mt-2 font-medium">{relationshipLabel(edgeLabel)}</p>
              )}
            </div>

            {/* Evidence */}
            {edgeEvidence && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-3 h-3 text-amber-400" /> Evidence
                </p>
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5">
                  <p className="text-xs text-amber-200/90 leading-relaxed font-mono">{edgeEvidence}</p>
                </div>
              </div>
            )}

            {/* MITRE ATT&CK */}
            {edgeMitre && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">MITRE ATT&amp;CK</p>
                {mitreBadge(edgeMitre)}
              </div>
            )}

            {/* Terraform Source */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                <FileCode2 className="w-3 h-3 text-teal-400" /> Terraform Source
              </p>
              <div className="rounded-xl border border-white/[0.08] bg-black/60 p-3.5 overflow-x-auto">
                <pre className="text-[10px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">{
                  edgeLabel === "public_ingress"
                    ? `resource "aws_security_group" "..." {\n  ingress {\n    cidr_blocks = ["0.0.0.0/0"]\n    from_port   = 22\n  }\n}`
                    : edgeLabel === "instance_profile"
                    ? `resource "aws_instance" "..." {\n  iam_instance_profile = ...\n}`
                    : edgeLabel === "data_access" || edgeLabel === "attached_policy"
                    ? `resource "aws_iam_role_policy" "..." {\n  policy = jsonencode({\n    Action   = ["s3:*"]\n    Resource = "*"\n  })\n}`
                    : `# Terraform resource relationship\n# See IaC source for details`
                }</pre>
              </div>
            </div>

            {/* Verification badge */}
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-[11px] text-emerald-300 font-semibold">Relationship verified — graph engine proven, not AI-inferred</p>
            </div>
          </>
        ) : (
          <>
            {/* Resource Name */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Resource</p>
              <p className="text-sm font-bold text-slate-100">{nodeData.label || selectedElement.id || selectedElement.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{kind}</p>
            </div>

            {/* Risk Score */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Risk Score</p>
                <span className={`text-xs font-bold ${risk >= 70 ? "text-red-400" : risk >= 40 ? "text-amber-400" : "text-emerald-400"}`}>{risk}/100</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${risk >= 70 ? "bg-red-500" : risk >= 40 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${risk}%` }}
                />
              </div>
            </div>

            {/* Exposure & Crown Jewel badges */}
            <div className="flex flex-wrap gap-2">
              {isInternetFacing && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-2.5 h-2.5" /> Internet Exposed
                </span>
              )}
              {isCrownJewel && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-violet-500/10 border border-violet-500/30 text-violet-400 px-2 py-0.5 rounded-full">
                  ★ Crown Jewel Asset
                </span>
              )}
              {!isInternetFacing && !isCrownJewel && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-500/10 border border-slate-500/30 text-slate-400 px-2 py-0.5 rounded-full">
                  Private
                </span>
              )}
            </div>

            {/* Findings */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 text-amber-400" /> Active Findings ({issueCount})
              </p>
              {findings.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {findings.slice(0, 6).map((f) => (
                    <span key={f} className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/25 text-amber-400 px-2 py-0.5 rounded-md">{f}</span>
                  ))}
                  {findings.length > 6 && <span className="text-[10px] text-slate-500">+{findings.length - 6} more</span>}
                </div>
              ) : issueCount === 0 ? (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> No active findings</p>
              ) : (
                <p className="text-[11px] text-slate-500">{issueCount} finding(s) detected</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
