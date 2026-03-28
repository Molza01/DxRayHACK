import { useEffect, useState, useCallback, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { RefreshCw, Info, Eye, EyeOff } from 'lucide-react';
import PageTransition from '../animations/PageTransition';
import StatusBadge from '../components/StatusBadge';
import { fetchBuilds, fetchBuild, fetchAnalytics } from '../services/api';

const statusColors = {
  success: '#34d399',
  failure: '#f87171',
  cancelled: '#fbbf24',
  skipped: '#64748b',
  in_progress: '#60a5fa',
};

// Performance overlay colors based on duration severity
function getLatencyColor(duration, maxDuration) {
  const ratio = duration / Math.max(maxDuration, 1);
  if (ratio > 0.7) return '#ef4444'; // red - very slow
  if (ratio > 0.4) return '#f97316'; // orange - slow
  if (ratio > 0.2) return '#eab308'; // yellow - moderate
  return '#22c55e'; // green - fast
}

function StepNode({ data }) {
  const overlay = data.overlay;
  let borderColor = statusColors[data.status] || '#818cf8';
  let glowIntensity = '40';

  if (overlay === 'latency') {
    borderColor = getLatencyColor(data.duration, data.maxDuration || 300);
    glowIntensity = '60';
  } else if (overlay === 'flaky' && data.flakyScore > 0) {
    borderColor = data.flakyScore > 50 ? '#ef4444' : data.flakyScore > 25 ? '#f97316' : '#eab308';
    glowIntensity = '60';
  }

  return (
    <div
      className="px-4 py-3 rounded-xl border-2 text-center min-w-[160px] relative"
      style={{
        background: 'rgba(15,15,40,0.9)',
        borderColor,
        boxShadow: `0 0 ${overlay ? '18' : '12'}px ${borderColor}${glowIntensity}`,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: borderColor, border: 'none', width: 8, height: 8 }}
      />
      <div className="text-white text-xs font-semibold mb-1">{data.label}</div>
      <div className="text-slate-400 text-[10px]">{data.duration}s</div>
      <div className="flex justify-center mt-1">
        <StatusBadge status={data.status} />
      </div>
      {/* Overlay badges */}
      {overlay === 'latency' && (
        <div className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[8px] font-bold"
          style={{ backgroundColor: borderColor, color: '#fff' }}>
          {data.duration}s
        </div>
      )}
      {overlay === 'flaky' && data.flakyScore > 0 && (
        <div className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[8px] font-bold"
          style={{ backgroundColor: borderColor, color: '#fff' }}>
          {data.flakyScore}%
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: borderColor, border: 'none', width: 8, height: 8 }}
      />
    </div>
  );
}

function JobNode({ data }) {
  return (
    <div
      className="px-4 py-2 rounded-xl text-center"
      style={{
        background: 'rgba(99,102,241,0.1)',
        border: '1px solid rgba(99,102,241,0.3)',
        color: '#a5b4fc',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#818cf8', border: 'none', width: 8, height: 8 }}
      />
      {data.label}
    </div>
  );
}

export default function Pipeline() {
  const nodeTypes = useMemo(() => ({ stepNode: StepNode, jobNode: JobNode }), []);
  const [builds, setBuilds] = useState([]);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [clickedStep, setClickedStep] = useState(null);
  const [overlay, setOverlay] = useState('none'); // 'none', 'latency', 'flaky'
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchBuilds({ limit: 20 }),
      fetchAnalytics().catch(() => null),
    ]).then(([buildsData, analytics]) => {
      setBuilds(buildsData.builds);
      setAnalyticsData(analytics);
      if (buildsData.builds.length > 0) setSelectedBuild(buildsData.builds[0]._id);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBuild) return;
    fetchBuild(selectedBuild).then((d) => {
      setDetail(d);
      buildGraph(d.steps);
      setClickedStep(null);
    });
  }, [selectedBuild, overlay]);

  const buildGraph = useCallback((steps) => {
    if (!steps || steps.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Build flaky score lookup from analytics
    const flakyLookup = {};
    if (analyticsData?.flakySteps) {
      analyticsData.flakySteps.forEach(f => { flakyLookup[f.stepName] = f.instabilityScore; });
    }

    const maxDuration = Math.max(...steps.map(s => s.duration), 1);

    const jobs = {};
    steps.forEach((step) => {
      if (!jobs[step.jobName]) jobs[step.jobName] = [];
      jobs[step.jobName].push(step);
    });

    const newNodes = [];
    const newEdges = [];
    let yOffset = 0;

    Object.entries(jobs).forEach(([jobName, jobSteps]) => {
      const jobId = `job-${jobName}`;
      newNodes.push({
        id: jobId,
        type: 'jobNode',
        position: { x: 20, y: yOffset + 10 },
        data: { label: jobName },
        draggable: true,
      });

      jobSteps.sort((a, b) => a.stepNumber - b.stepNumber);
      let prevId = jobId;

      jobSteps.forEach((step, i) => {
        const nodeId = `step-${step._id}`;
        newNodes.push({
          id: nodeId,
          type: 'stepNode',
          position: { x: 250 + i * 230, y: yOffset },
          data: {
            label: step.stepName,
            status: step.status,
            duration: step.duration,
            step,
            overlay,
            maxDuration,
            flakyScore: flakyLookup[step.stepName] || 0,
          },
          draggable: true,
        });

        // Edge color based on overlay
        let edgeColor = statusColors[step.status] || '#818cf8';
        if (overlay === 'latency') edgeColor = getLatencyColor(step.duration, maxDuration);
        if (overlay === 'flaky' && flakyLookup[step.stepName]) {
          const fs = flakyLookup[step.stepName];
          edgeColor = fs > 50 ? '#ef4444' : fs > 25 ? '#f97316' : '#eab308';
        }

        newEdges.push({
          id: `edge-${prevId}-${nodeId}`,
          source: prevId,
          target: nodeId,
          animated: step.status === 'in_progress' || (overlay === 'flaky' && flakyLookup[step.stepName] > 25),
          type: 'smoothstep',
          style: { stroke: edgeColor, strokeWidth: overlay !== 'none' ? 3 : 2 },
        });

        prevId = nodeId;
      });

      yOffset += 140;
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [setNodes, setEdges, overlay, analyticsData]);

  const onNodeClick = useCallback((_, node) => {
    if (node.data?.step) setClickedStep(node.data.step);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <RefreshCw size={28} className="text-indigo-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white neon-text">Pipeline Graph</h1>
            <p className="text-slate-400 mt-1">Interactive visualization with performance overlays</p>
          </div>
          {/* Overlay toggle */}
          <div className="flex gap-2">
            {[
              { id: 'none', label: 'Status', icon: Eye },
              { id: 'latency', label: 'Latency', icon: Eye },
              { id: 'flaky', label: 'Flaky', icon: Eye },
            ].map((o) => (
              <button
                key={o.id}
                onClick={() => setOverlay(o.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  overlay === o.id
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                <o.icon size={14} />
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overlay legend */}
        {overlay !== 'none' && (
          <div className="flex items-center gap-4 mb-4 px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-800/50">
            <span className="text-xs text-slate-400">
              {overlay === 'latency' ? 'Latency:' : 'Flaky Score:'}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#22c55e' }} />
                <span className="text-[10px] text-slate-500">{overlay === 'latency' ? 'Fast' : 'Stable'}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#eab308' }} />
                <span className="text-[10px] text-slate-500">Moderate</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f97316' }} />
                <span className="text-[10px] text-slate-500">{overlay === 'latency' ? 'Slow' : 'Flaky'}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
                <span className="text-[10px] text-slate-500">{overlay === 'latency' ? 'Very Slow' : 'Very Flaky'}</span>
              </div>
            </div>
          </div>
        )}

        {builds.length === 0 ? (
          <div className="glass p-16 text-center">
            <Info size={40} className="text-indigo-400 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl text-white mb-2">No builds available</h2>
            <p className="text-slate-400">Go to the Dashboard to load demo data or sync from GitHub first.</p>
          </div>
        ) : (
          <>
            {/* Build selector */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {builds.map((b) => (
                <button
                  key={b._id}
                  onClick={() => setSelectedBuild(b._id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedBuild === b._id
                      ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                      : 'bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:text-white'
                  }`}
                >
                  <StatusBadge status={b.status} />
                  <span className="ml-2">{b.workflowName}</span>
                  <span className="text-slate-500 ml-1">#{b.runId}</span>
                </button>
              ))}
            </div>

            {/* Graph */}
            <div className="glass overflow-hidden rounded-xl" style={{ height: 550 }}>
              {nodes.length > 0 ? (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={onNodeClick}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.3 }}
                  proOptions={{ hideAttribution: true }}
                  style={{ background: '#050510' }}
                  minZoom={0.3}
                  maxZoom={2}
                >
                  <Background color="rgba(99,102,241,0.08)" gap={30} />
                  <Controls
                    style={{ background: 'rgba(15,15,40,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }}
                  />
                  <MiniMap
                    nodeColor={(n) => {
                      if (overlay === 'latency') return getLatencyColor(n.data?.duration || 0, n.data?.maxDuration || 300);
                      return statusColors[n.data?.status] || '#818cf8';
                    }}
                    maskColor="rgba(5,5,16,0.8)"
                    style={{ background: 'rgba(15,15,40,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }}
                  />
                </ReactFlow>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <p>No steps found for this build</p>
                </div>
              )}
            </div>

            {/* Clicked step detail */}
            {clickedStep && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-5 mt-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Step Details</h3>
                  <button onClick={() => setClickedStep(null)} className="text-slate-500 hover:text-white text-sm">close</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-slate-500 block">Step Name</span>
                    <span className="text-sm text-white">{clickedStep.stepName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Job</span>
                    <span className="text-sm text-white">{clickedStep.jobName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Duration</span>
                    <span className="text-sm text-white">{clickedStep.duration}s</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Status</span>
                    <StatusBadge status={clickedStep.status} />
                  </div>
                </div>
                {clickedStep.logs && (
                  <div className="terminal rounded-lg p-3 max-h-[200px] overflow-y-auto border border-indigo-500/10">
                    {clickedStep.logs.split('\n').map((line, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-slate-600 select-none mr-3">{i + 1}</span>
                        <span className={
                          line.includes('FAIL') || line.includes('Error') || line.includes('✗') ? 'text-red-400' :
                          line.includes('PASS') || line.includes('✓') || line.includes('success') ? 'text-emerald-400' :
                          line.includes('$') || line.includes('>') ? 'text-indigo-400' : 'text-slate-300'
                        }>{line}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
