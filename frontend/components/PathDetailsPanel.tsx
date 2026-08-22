import { X, FileCode2, ShieldAlert, GitBranch } from "lucide-react";

export function PathDetailsPanel({ 
  selectedElement, 
  elementType, 
  onClose 
}: { 
  selectedElement: any, 
  elementType: 'node' | 'edge' | null, 
  onClose: () => void 
}) {
  if (!selectedElement) return null;

  return (
    <div className="absolute right-6 top-6 bottom-6 w-80 rounded-2xl border border-white/[0.08] bg-slate-950/95 backdrop-blur shadow-2xl flex flex-col z-20 overflow-hidden shadow-black/50">
      <div className="flex items-center justify-between border-b border-white/[0.08] p-4 bg-white/[0.02]">
        <h3 className="font-bold text-slate-100 flex items-center gap-2">
          {elementType === 'node' ? <BoxIcon className="w-4 h-4 text-teal-400"/> : <GitBranch className="w-4 h-4 text-rose-400"/>}
          {elementType === 'node' ? 'Resource Details' : 'Relationship Evidence'}
        </h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-6">
        
        {/* Name / ID */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
            {elementType === 'node' ? 'Resource' : 'Connection'}
          </p>
          <p className="text-sm font-semibold text-slate-200">
            {elementType === 'node' ? selectedElement.label || selectedElement.id : `${selectedElement.source} → ${selectedElement.target}`}
          </p>
          {elementType === 'node' && (
            <p className="text-xs text-slate-500 mt-1">{selectedElement.kind}</p>
          )}
        </div>

        {/* Evidence / Reason */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-amber-400" /> Finding Context
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3">
            <p className="text-xs text-amber-200/90 leading-relaxed">
              {selectedElement.evidence || "This relationship allows potential privilege escalation due to overly permissive IAM policies attached to the EC2 profile."}
            </p>
          </div>
        </div>

        {/* Terraform Block */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
            <FileCode2 className="w-3 h-3 text-teal-400" /> Terraform Resource
          </p>
          <div className="rounded-xl border border-white/[0.08] bg-black p-3 overflow-x-auto">
            <pre className="text-[10px] text-slate-300 font-mono leading-relaxed">
{selectedElement.terraform || `resource "aws_iam_role_policy" "example" {
  name = "example"
  role = aws_iam_role.example.id

  policy = jsonencode({
    Statement = [{
      Action   = "sts:AssumeRole"
      Effect   = "Allow"
      Resource = "*" // Detected Wildcard
    }]
  })
}`}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  );
}
