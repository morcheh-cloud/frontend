import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";

import { useCallback, useState } from "react";

import "@xyflow/react/dist/style.css";

const initialNodes = [
  { data: { label: "Node 1" }, id: "n1", position: { x: 0, y: 0 } },
  { data: { label: "Node 2" }, id: "n2", position: { x: 0, y: 100 } },
];
const initialEdges = [{ id: "n1-n2", source: "n1", target: "n2" }];

const nodeClassName = (node) => node.type;

export function App() {
  const [nodes, setNodes] = useState(initialNodes);
  console.log("🚀 ~ App ~ nodes:", nodes);
  const [edges, setEdges] = useState(initialEdges);
  console.log("🚀 ~ App ~ edges:", edges);

  const onNodesChange = useCallback(
    (changes: any) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: any) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );
  const onConnect = useCallback(
    (params: any) =>
      setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    []
  );

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      />
      <Controls />
      <MiniMap zoomable pannable nodeClassName={nodeClassName} />
      <Background />
    </div>
  );
}

export default () => (
  <ReactFlowProvider>
    <App />
  </ReactFlowProvider>
);
