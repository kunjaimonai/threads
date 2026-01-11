'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Zap, Film, ChevronRight } from 'lucide-react';

type UploadKey = 'sneaker' | 'box' | 'video';

interface AnalysisResult {
  verdict: 'REAL' | 'FAKE';
  realness_percent: number;
  [key: string]: any;
}

const SHOE_ID_MAP: Record<string, string> = {
  'Jordan 1 Lost & Found': 'jordan1_lost_found',
  'Travis Scott Olive': 'travis_scott_olive',
  'Yeezy 350 Zebra': 'yeezy_350_zebra',
};

function ResultCard({
  title,
  verdict,
  percent,
}: {
  title: string;
  verdict: 'REAL' | 'FAKE';
  percent: number;
}) {
  const isReal = verdict === 'REAL';
  const color = isReal ? 'text-green-400' : 'text-red-400';
  const bgColor = isReal ? 'bg-green-500/20' : 'bg-red-500/20';
  const borderColor = isReal ? 'border-green-500/50' : 'border-red-500/50';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <h3 className="text-sm font-semibold text-slate-200 mb-3">{title}</h3>
      <div className="flex items-center gap-4">
        <div>
          <div className={`text-2xl font-bold ${color}`}>{percent}%</div>
          <div className={`text-sm font-semibold ${color}`}>{verdict}</div>
        </div>
        <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${isReal ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function UploadCard({
  title,
  tip,
  Icon,
  tipColor,
  keyName,
  file,
  acceptType,
  previewType,
  onSelect,
  onRemove,
}: {
  title: string;
  tip: string;
  Icon: any;
  tipColor: string;
  keyName: UploadKey;
  file: File | null;
  acceptType: string;
  previewType: 'image' | 'video';
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleFile = (f?: File) => {
    if (!f) return;
    onSelect(f);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log(`File selected for ${keyName}:`, file?.name, file?.type, file?.size);
    handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleButtonClick = () => {
    if (!file && previewType === 'video') {
      setShowInfo(true);
      return;
    }
    openPicker();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={acceptType}
        className="hidden"
        onChange={onChange}
      />
      <button
        onClick={handleButtonClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="w-full aspect-[4/3] bg-[#111827] border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-slate-600 hover:bg-slate-800/30 transition-all group relative overflow-hidden"
      >
        {file ? (
          <>
            {previewType === 'image' ? (
              <img
                src={URL.createObjectURL(file)}
                alt={`${keyName} preview`}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
            ) : (
              <video
                src={URL.createObjectURL(file)}
                className="absolute inset-0 w-full h-full object-cover"
                controls
                muted
              />
            )}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
              <span className="text-xs bg-black/50 px-2 py-1 rounded text-white">{file.name}</span>
              <span
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="text-xs bg-black/50 px-2 py-1 rounded text-red-300 cursor-pointer"
              >
                Remove
              </span>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-slate-500 group-hover:text-blue-400" />
            <span className="text-sm font-semibold text-slate-300">{title}</span>
            <span className="text-xs text-slate-500">Click or drop {previewType}</span>
          </>
        )}

        {showInfo && previewType === 'video' && !file && (
          <div className="absolute inset-0 bg-black/80 text-white p-4 flex flex-col justify-between">
            <div>
              <h4 className="text-base font-bold mb-2">How to record a texture video</h4>
              <ul className="text-sm list-disc pl-5 space-y-1 text-slate-200">
                <li>Use bright, even lighting.</li>
                <li>Hold the shoe close; keep the camera steady.</li>
                <li>Rub across toe box, side panel, and heel.</li>
                <li>Ensure the shoe fills most of the frame.</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowInfo(false); openPicker(); }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded"
              >
                Start Upload
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-3 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </button>
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight ${tipColor} bg-black/20 px-3 py-1 rounded-full border border-white/5`}>
        <Icon className="w-3 h-3" />
        {tip}
      </div>
    </div>
  );
}

export default function VeriKicksUpload() {
  const router = useRouter();
  const [modelDropdown, setModelDropdown] = useState<string>('Jordan 1 Lost & Found');
  const [uploads, setUploads] = useState<Record<UploadKey, File | null>>({
    sneaker: null,
    box: null,
    video: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{
    combined: any;
    box?: AnalysisResult;
    video?: AnalysisResult;
    sneaker?: AnalysisResult;
  }>({ combined: undefined });
  const [error, setError] = useState<string>('');

  const canProceed = !!(uploads.sneaker && uploads.box && uploads.video);

  const handleSelect = (key: UploadKey, file: File) => {
    setUploads(prev => ({ ...prev, [key]: file }));
  };

  const handleRemove = (key: UploadKey) => {
    setUploads(prev => ({ ...prev, [key]: null }));
    setResults(prev => ({ ...prev, [key]: undefined }));
    setError('');
  };

  const submitUpload = async () => {
    if (!canProceed || submitting) return;
    setSubmitting(true);
    setError('');
    setResults({ combined: undefined });

    try {
      const shoeId = SHOE_ID_MAP[modelDropdown];
      console.log('Starting analysis with shoe_id:', shoeId);
      console.log('Box file:', uploads.box?.name, uploads.box?.size);
      console.log('Video file:', uploads.video?.name, uploads.video?.size);
      
      const promises = [];

      // Send sneaker image to sneaker endpoint
      if (uploads.sneaker) {
        const sneakerForm = new FormData();
        sneakerForm.append('shoe_id', shoeId);
        sneakerForm.append('file', uploads.sneaker);
        promises.push(
          fetch('/api/analyze/sneaker', { method: 'POST', body: sneakerForm })
            .then(r => {
              console.log('Sneaker response status:', r.status);
              return r.json();
            })
            .then(data => {
              console.log('Sneaker analysis result:', data);
              return { key: 'sneaker' as const, data };
            })
        );
      }

      // Send box image to box endpoint
      if (uploads.box) {
        const boxForm = new FormData();
        boxForm.append('shoe_id', shoeId);
        boxForm.append('file', uploads.box);
        promises.push(
          fetch('/api/analyze/box', { method: 'POST', body: boxForm })
            .then(r => {
              console.log('Box response status:', r.status);
              return r.json();
            })
            .then(data => {
              console.log('Box analysis result:', data);
              return { key: 'box' as const, data };
            })
        );
      }

      // Send video to video endpoint
      if (uploads.video) {
        const videoForm = new FormData();
        videoForm.append('shoe_id', shoeId);
        videoForm.append('file', uploads.video);
        promises.push(
          fetch('/api/analyze/video', { method: 'POST', body: videoForm })
            .then(r => {
              console.log('Video response status:', r.status);
              return r.json();
            })
            .then(data => {
              console.log('Video analysis result:', data);
              return { key: 'video' as const, data };
            })
        );
      }

      const allResults = await Promise.all(promises);
      const newResults: typeof results = {
        combined: undefined
      };
      for (const { key, data } of allResults) {
        if (data.error) {
          console.error(`${key} error:`, data.error);
          setError(prev => prev + `${key}: ${data.error}\n`);
        } else {
          newResults[key] = data as AnalysisResult;
        }
      }
      setResults(newResults);
      
      // Get combined analysis
      if (newResults.sneaker && newResults.box && newResults.video) {
        const combinedForm = new FormData();
        combinedForm.append('shoe_id', shoeId);
        combinedForm.append('sneaker_percent', String(newResults.sneaker.realness_percent));
        combinedForm.append('box_percent', String(newResults.box.realness_percent));
        combinedForm.append('video_percent', String(newResults.video.realness_percent));
        
        const combinedRes = await fetch('/api/analyze/combined', {
          method: 'POST',
          body: combinedForm,
        });
        const combinedData = await combinedRes.json();
        console.log('Combined result:', combinedData);
        
        if (!combinedData.error) {
          newResults.combined = combinedData;
        }
      }
      
      // Navigate to results page with data
      const sneakerParam = newResults.sneaker ? encodeURIComponent(JSON.stringify(newResults.sneaker)) : '';
      const boxParam = newResults.box ? encodeURIComponent(JSON.stringify(newResults.box)) : '';
      const videoParam = newResults.video ? encodeURIComponent(JSON.stringify(newResults.video)) : '';
      const combinedParam = newResults.combined ? encodeURIComponent(JSON.stringify(newResults.combined)) : '';
      const params = new URLSearchParams();
      if (sneakerParam) params.append('sneaker', sneakerParam);
      if (boxParam) params.append('box', boxParam);
      if (videoParam) params.append('video', videoParam);
      if (combinedParam) params.append('combined', combinedParam);
      params.append('model', modelDropdown);
      
      router.push(`/results?${params.toString()}`);
    } catch (e) {
      console.error('Analysis error:', e);
      setError('Analysis failed. Check browser console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-blue-500 text-xs font-bold tracking-widest uppercase">Step 1 of 4</span>
            <span className="text-slate-500 text-xs">Selection & Upload</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full w-1/4" />
          </div>
          <h1 className="text-3xl font-bold mt-8 mb-2 text-white">Let's Verify Your Kicks</h1>
          <p className="text-slate-400">Pick your model and upload the required media.</p>
        </div>

        {/* Model Selection */}
        <div className="bg-[#111827] rounded-xl border border-slate-800 overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-800">
            <select
              value={modelDropdown}
              onChange={(e) => setModelDropdown(e.target.value)}
              className="w-full bg-[#1a2234] border border-slate-700 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-200"
            >
              <option>Jordan 1 Lost & Found</option>
              <option>Travis Scott Olive</option>
              <option>Yeezy 350 Zebra</option>
            </select>
          </div>
        </div>

        {/* Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <UploadCard
            title="Sneaker Photo"
            tip="Clear toe box view"
            Icon={Upload}
            tipColor="text-blue-400"
            keyName="sneaker"
            file={uploads.sneaker}
            acceptType="image/*"
            previewType="image"
            onSelect={(file: File) => handleSelect('sneaker', file)}
            onRemove={() => handleRemove('sneaker')}
          />
          <UploadCard
            title="Box Photo"
            tip="Show label clearly"
            Icon={Zap}
            tipColor="text-emerald-400"
            keyName="box"
            file={uploads.box}
            acceptType="image/*"
            previewType="image"
            onSelect={(file: File) => handleSelect('box', file)}
            onRemove={() => handleRemove('box')}
          />
          <UploadCard
            title="Video"
            tip="Clear view of shoe texture"
            Icon={Film}
            tipColor="text-slate-400"
            keyName="video"
            file={uploads.video}
            acceptType="video/*"
            previewType="video"
            onSelect={(file: File) => handleSelect('video', file)}
            onRemove={() => handleRemove('video')}
          />
        </div>

        {/* Results Display */}
        {(results.sneaker || results.box || results.video || error) && (
          <div className="bg-[#111827] rounded-xl border border-slate-800 p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Analysis Results</h2>
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4 text-red-300 text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {results.sneaker && (
                <ResultCard
                  title="Stitch Analysis"
                  verdict={results.sneaker.verdict === 'REAL' ? 'REAL' : 'FAKE'}
                  percent={results.sneaker.realness_percent}
                />
              )}
              {results.box && (
                <ResultCard
                  title="Box Analysis"
                  verdict={results.box.verdict}
                  percent={results.box.realness_percent}
                />
              )}
              {results.video && (
                <ResultCard
                  title="Video Analysis"
                  verdict={results.video.verdict}
                  percent={results.video.realness_percent}
                />
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <hr className="border-slate-800 mb-8" />
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <button className="text-slate-500 text-sm hover:text-slate-300 font-medium">
            Cancel Authentication
          </button>
          <div className="flex items-center gap-6">
            <span className="text-xs text-slate-500">Sneaker, box & video uploads required</span>
            <button
              onClick={submitUpload}
              disabled={!canProceed || submitting}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm border ${
                canProceed && !submitting
                  ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700'
                  : 'bg-[#1e293b] text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              {submitting ? 'Analyzing...' : 'Analyze'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}