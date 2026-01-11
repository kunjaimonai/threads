'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, ChevronRight, RotateCcw } from 'lucide-react';

interface AnalysisResult {
  verdict: 'REAL' | 'FAKE';
  realness_percent: number;
  [key: string]: any;
}

interface CombinedResult {
  realness_percent: number;
  verdict: string;
  sneaker_percent?: number;
  box_percent?: number;
  video_percent?: number;
  confidence?: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<{
    sneaker?: AnalysisResult;
    box?: AnalysisResult;
    video?: AnalysisResult;
    combined?: CombinedResult;
  }>({});
  const [shoeModel, setShoeModel] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const handleBack = () => {
    router.back();
  };

  useEffect(() => {
    // Get results from URL params
    const sneakerData = searchParams.get('sneaker');
    const boxData = searchParams.get('box');
    const videoData = searchParams.get('video');
    const combinedData = searchParams.get('combined');
    const model = searchParams.get('model');

    setShoeModel(model || 'Unknown Model');

    try {
      if (sneakerData) {
        setResults(prev => ({
          ...prev,
          sneaker: JSON.parse(decodeURIComponent(sneakerData)) as AnalysisResult,
        }));
      }
      if (boxData) {
        setResults(prev => ({
          ...prev,
          box: JSON.parse(decodeURIComponent(boxData)) as AnalysisResult,
        }));
      }
      if (videoData) {
        setResults(prev => ({
          ...prev,
          video: JSON.parse(decodeURIComponent(videoData)) as AnalysisResult,
        }));
      }
      if (combinedData) {
        setResults(prev => ({
          ...prev,
          combined: JSON.parse(decodeURIComponent(combinedData)) as CombinedResult,
        }));
      }
    } catch (e) {
      console.error('Failed to parse results:', e);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const overallVerdict = 
    results.combined?.verdict === 'AUTHENTIC' ? 'AUTHENTIC' :
    results.combined?.verdict === 'COUNTERFEIT' ? 'COUNTERFEIT' :
    results.combined?.verdict || 'INCONCLUSIVE';

  const overallPercent = results.combined?.realness_percent || 0;

  const isAuthentic = overallVerdict === 'AUTHENTIC';

  const handleRestart = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mt-8 mb-2 text-white">Verification Complete</h1>
              <p className="text-slate-400">Your {shoeModel} has been analyzed</p>
            </div>
            <button
              onClick={handleBack}
              className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-2"
            >
              <RotateCcw className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>

        {/* Overall Verdict Card */}
        <div
          className={`rounded-xl border p-8 mb-8 text-center ${
            isAuthentic
              ? 'bg-green-500/20 border-green-500/50'
              : overallVerdict === 'COUNTERFEIT'
              ? 'bg-red-500/20 border-red-500/50'
              : 'bg-yellow-500/20 border-yellow-500/50'
          }`}
        >
          <div className="flex justify-center mb-4">
            {isAuthentic ? (
              <CheckCircle2 className="w-16 h-16 text-green-400" />
            ) : (
              <AlertCircle className="w-16 h-16 text-red-400" />
            )}
          </div>
          <div className="text-5xl font-bold mb-2">
            {overallPercent}%
          </div>
          <div className={`text-2xl font-bold mb-4 ${
            isAuthentic
              ? 'text-green-400'
              : overallVerdict === 'COUNTERFEIT'
              ? 'text-red-400'
              : 'text-yellow-400'
          }`}>
            {overallVerdict}
          </div>
          <p className="text-slate-300">
            {isAuthentic
              ? 'This shoe passed our authenticity verification.'
              : overallVerdict === 'COUNTERFEIT'
              ? 'This shoe appears to be counterfeit.'
              : 'Results are inconclusive. More data needed.'}
          </p>
        </div>

        {/* Individual Analysis Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {results.sneaker && (
            <DetailCard
              title="Stitch Pattern Analysis"
              result={{
                verdict: results.sneaker.verdict === 'REAL' ? 'REAL' : 'FAKE',
                realness_percent: results.sneaker.realness_percent,
              }}
              details={[
                { label: 'Detected Stitches', value: results.sneaker.detected_stitches },
                { label: 'Expected Stitches', value: results.sneaker.expected_stitches },
                { label: 'Area', value: results.sneaker.detection_area || 'Full Image' },
              ]}
            />
          )}
          {results.box && (
            <DetailCard
              title="Box Label Analysis"
              result={results.box}
              details={[
                { label: 'Barcode Check', value: results.box.barcode_check },
                { label: 'Label Found', value: results.box.debug_label_found ? 'Yes' : 'No' },
              ]}
            />
          )}
          {results.video && (
            <DetailCard
              title="Texture Analysis"
              result={results.video}
              details={[
                { label: 'Frames Analyzed', value: results.video.frames_analyzed },
                { label: 'Detections', value: results.video.detections_count },
                { label: 'Confidence', value: `${(results.video.median_confidence * 100).toFixed(0)}%` },
              ]}
            />
          )}
        </div>

        {/* Detailed Reasons */}
        {results.box?.reasons && results.box.reasons.length > 0 && (
          <div className="bg-[#111827] rounded-xl border border-slate-800 p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4">Analysis Details</h3>
            <ul className="space-y-2">
              {results.box.reasons.map((reason: string, idx: number) => (
                <li key={idx} className="text-slate-300 flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <hr className="border-slate-800 mb-8" />
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <button
            onClick={handleRestart}
            className="text-slate-500 text-sm hover:text-slate-300 font-medium flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Verify Another Shoe
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm border bg-blue-600 text-white border-blue-500 hover:bg-blue-700"
            >
              Next Step
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  title,
  result,
  details,
}: {
  title: string;
  result: AnalysisResult;
  details: { label: string; value: any }[];
}) {
  const isReal = result.verdict === 'REAL';
  const bgColor = isReal ? 'bg-green-500/20' : 'bg-red-500/20';
  const borderColor = isReal ? 'border-green-500/50' : 'border-red-500/50';
  const textColor = isReal ? 'text-green-400' : 'text-red-400';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-6`}>
      <h4 className="text-lg font-bold text-white mb-4">{title}</h4>
      <div className="mb-4 pb-4 border-b border-slate-700">
        <div className={`text-3xl font-bold ${textColor}`}>{result.realness_percent}%</div>
        <div className={`text-sm font-semibold ${textColor}`}>{result.verdict}</div>
      </div>
      <div className="space-y-3">
        {details.map((detail, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">{detail.label}</span>
            <span className="text-slate-200 font-medium">{String(detail.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
