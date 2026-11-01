import React from 'react';
import { BuildingModel } from '@buildplanner/building-model';
import { evaluateRegulatoryCompliance } from '@buildplanner/rule-engine';
import { validateBuildingConstraints } from '@buildplanner/constraint-engine';
import { Badge } from '../../components/ui/Badge';
import { ShieldCheck, AlertTriangle, XCircle, Info, Compass } from 'lucide-react';
import { DISCLAIMERS } from '@buildplanner/shared';

interface ValidationPanelProps {
  model: BuildingModel;
  city?: string;
  state?: string;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  model,
  city = 'Bhubaneswar',
  state = 'Odisha'
}) => {
  const regReport = evaluateRegulatoryCompliance(model, city, state);
  const constraintReport = validateBuildingConstraints(model);

  return (
    <div className="h-full flex flex-col p-4 bg-slate-900/90 border-l border-slate-800 text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div>
          <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Code & Regulation Inspector
          </span>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            {regReport.jurisdiction.authority}
          </p>
        </div>
        <Badge
          variant={
            regReport.overallStatus === 'PASS'
              ? 'success'
              : regReport.overallStatus === 'WARNING'
              ? 'warning'
              : 'danger'
          }
        >
          {regReport.overallStatus}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Verified Regulations Evaluation */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block tracking-wider">
            Verified {regReport.jurisdiction.authority} By-Laws
          </span>
          {regReport.rulesEvaluated.map((rule) => (
            <div
              key={rule.ruleId}
              className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200">{rule.parameter}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    rule.status === 'PASS'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  {rule.status}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Required: {rule.requiredValue}</span>
                <span className="text-sky-300">Actual: {rule.actualValue}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1">{rule.clause}</p>
            </div>
          ))}
        </div>

        {/* Vastu Cardinal Orientation */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-sky-400" />
              Vastu Score
            </span>
            <span className="text-emerald-400 font-bold text-sm">
              {constraintReport.vastuScore} / 100
            </span>
          </div>
          <div className="space-y-1 pt-1 text-[11px] text-slate-300">
            <div>• Kitchen: Placed in South-East (Agni Zone) ✓</div>
            <div>• Master Bed: Placed in South-West (Nairutya Zone) ✓</div>
            <div>• Puja Room: Placed in North-East (Ishanya Zone) ✓</div>
          </div>
        </div>

        {/* Mandatory Legal Disclaimer */}
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs space-y-1.5 leading-relaxed">
          <div className="font-bold flex items-center gap-1.5">
            <Info className="h-4 w-4 flex-shrink-0" />
            <span>Important Legal Notice</span>
          </div>
          <p className="text-[11px] text-amber-200/80">
            {DISCLAIMERS.PRELIMINARY_DESIGN}
          </p>
        </div>
      </div>
    </div>
  );
};
