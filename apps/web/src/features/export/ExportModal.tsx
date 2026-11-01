import React, { useState } from 'react';
import { BuildingModel } from '@buildplanner/building-model';
import { renderFloorPlanSvg, renderElevationSvg } from '@buildplanner/drawing-engine';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Download, Printer, FileText, Image, Check } from 'lucide-react';
import { DISCLAIMERS } from '@buildplanner/shared';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: BuildingModel;
  projectName: string;
  location?: { city?: string; state?: string; country?: string };
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  model,
  projectName,
  location
}) => {
  const [activeSheet, setActiveSheet] = useState<number | 'ELEVATION'>(0);
  const [isExporting, setIsExporting] = useState(false);

  const currentSvg =
    activeSheet === 'ELEVATION'
      ? renderElevationSvg(model, 'NORTH')
      : renderFloorPlanSvg(model, typeof activeSheet === 'number' ? activeSheet : 0);

  const handleDownloadSvg = () => {
    setIsExporting(true);
    const blob = new Blob([currentSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sheetLabel = typeof activeSheet === 'number' ? `floor_${activeSheet}` : 'elevation';
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_${sheetLabel}_blueprint.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${projectName} — Architectural Drawing Package</title>
          <style>
            @page { size: A3 landscape; margin: 10mm; }
            body { font-family: monospace; margin: 0; padding: 20px; background: white; color: black; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .disclaimer { font-size: 10px; color: #b45309; font-weight: bold; margin-top: 5px; }
            .svg-container { width: 100%; height: 75vh; display: flex; align-items: center; justify-content: center; }
            svg { width: 100%; height: 100%; max-height: 75vh; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${projectName.toUpperCase()} — ARCHITECTURAL DRAWING PACKAGE</h2>
            <div>Location: ${(model.site.dimensionsMm.width / 1000).toFixed(1)}m × ${(model.site.dimensionsMm.length / 1000).toFixed(1)}m (${Math.round(model.site.dimensionsMm.width / 304.8)}' × ${Math.round(model.site.dimensionsMm.length / 304.8)}') Plot | ${location?.city || 'City'}, ${location?.country || 'Global'}</div>
            <div class="disclaimer">${DISCLAIMERS.PRELIMINARY_DESIGN}</div>
          </div>
          <div class="svg-container">
            ${currentSvg}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Architectural Drawing Package"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Sheet Selector */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 overflow-x-auto">
          <div className="flex items-center gap-2">
            {model.levels.map((lvl) => (
              <button
                key={lvl.levelIndex}
                onClick={() => setActiveSheet(lvl.levelIndex)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  activeSheet === lvl.levelIndex
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {lvl.name}
              </button>
            ))}
            <button
              onClick={() => setActiveSheet('ELEVATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                activeSheet === 'ELEVATION'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              North Elevation
            </button>
          </div>
          <span className="text-xs font-mono text-slate-400">Scale 1:50</span>
        </div>

        {/* Live Vector SVG Preview */}
        <div className="h-80 w-full rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-4 overflow-hidden blueprint-grid">
          <div
            className="w-full h-full flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: currentSvg }}
          />
        </div>

        {/* Disclaimer Notice */}
        <p className="text-[11px] font-mono text-amber-400 bg-amber-950/20 p-2.5 rounded-lg border border-amber-800/40 text-center">
          {DISCLAIMERS.PRELIMINARY_DESIGN}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleDownloadSvg}>
            <Download className="h-4 w-4 mr-2" />
            Download Vector SVG
          </Button>
          <Button onClick={handlePrintPdf} className="shadow-lg shadow-sky-500/25">
            <Printer className="h-4 w-4 mr-2" />
            Print / PDF Package
          </Button>
        </div>
      </div>
    </Modal>
  );
};
