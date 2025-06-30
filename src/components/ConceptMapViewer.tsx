import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Document, ConceptNode, ConceptConnection } from '../types';

interface ConceptMapViewerProps {
  document: Document;
  onClose: () => void;
}

export function ConceptMapViewer({ document, onClose }: ConceptMapViewerProps) {
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Create concept nodes from document concepts
  const conceptNodes: ConceptNode[] = document.concepts.slice(0, 12).map(concept => ({
    id: concept.id,
    label: concept.term,
    type: concept.importance > 7 ? 'primary' : concept.importance > 4 ? 'secondary' : 'supporting',
    definition: concept.definition,
    examples: [concept.context.substring(0, 100) + '...']
  }));

  // Generate connections based on concept relationships
  const connections: ConceptConnection[] = [];
  conceptNodes.forEach((node, index) => {
    // Connect to 2-3 other nodes
    const connectionCount = Math.min(3, Math.floor(Math.random() * 3) + 1);
    for (let i = 0; i < connectionCount; i++) {
      const targetIndex = (index + i + 1) % conceptNodes.length;
      if (targetIndex !== index) {
        connections.push({
          from: node.id,
          to: conceptNodes[targetIndex].id,
          relationship: generateRelationship(),
          strength: Math.random() * 0.5 + 0.5
        });
      }
    }
  });

  // Position nodes in a circular layout
  const centerX = 400;
  const centerY = 300;
  const radius = 200;
  
  const nodePositions = conceptNodes.map((node, index) => {
    const angle = (index / conceptNodes.length) * 2 * Math.PI;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    return { ...node, x, y };
  });

  const handleNodeClick = (nodeId: string) => {
    setSelectedConcept(selectedConcept === nodeId ? null : nodeId);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Concept Map</h2>
            <p className="text-sm text-gray-600">{document.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.2))}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.2))}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Map Area */}
          <div className="flex-1 relative overflow-hidden bg-gray-50">
            <svg
              ref={svgRef}
              className="w-full h-full cursor-move"
              viewBox={`${-pan.x} ${-pan.y} ${800 / zoom} ${600 / zoom}`}
            >
              {/* Connections */}
              <g>
                {connections.map((connection, index) => {
                  const fromNode = nodePositions.find(n => n.id === connection.from);
                  const toNode = nodePositions.find(n => n.id === connection.to);
                  
                  if (!fromNode || !toNode) return null;
                  
                  return (
                    <g key={index}>
                      <line
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke="#e5e7eb"
                        strokeWidth={connection.strength * 3}
                        strokeOpacity={0.6}
                      />
                      <text
                        x={(fromNode.x + toNode.x) / 2}
                        y={(fromNode.y + toNode.y) / 2}
                        textAnchor="middle"
                        className="text-xs fill-gray-500"
                        fontSize="10"
                      >
                        {connection.relationship}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Nodes */}
              <g>
                {nodePositions.map((node) => {
                  const isSelected = selectedConcept === node.id;
                  const nodeColor = node.type === 'primary' ? '#3b82f6' : 
                                   node.type === 'secondary' ? '#10b981' : '#6b7280';
                  
                  return (
                    <g key={node.id}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.type === 'primary' ? 30 : node.type === 'secondary' ? 25 : 20}
                        fill={nodeColor}
                        fillOpacity={isSelected ? 1 : 0.8}
                        stroke={isSelected ? '#1f2937' : 'white'}
                        strokeWidth={isSelected ? 3 : 2}
                        className="cursor-pointer transition-all duration-200"
                        onClick={() => handleNodeClick(node.id)}
                      />
                      <text
                        x={node.x}
                        y={node.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-white font-medium pointer-events-none"
                        fontSize={node.type === 'primary' ? '12' : '10'}
                      >
                        {node.label.length > 10 ? node.label.substring(0, 10) + '...' : node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Concept Details Panel */}
          {selectedConcept && (
            <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
              {(() => {
                const concept = conceptNodes.find(n => n.id === selectedConcept);
                if (!concept) return null;
                
                return (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {concept.label}
                      </h3>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        concept.type === 'primary' ? 'bg-blue-100 text-blue-800' :
                        concept.type === 'secondary' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {concept.type} concept
                      </span>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Definition</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {concept.definition}
                      </p>
                    </div>

                    {concept.examples.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Context</h4>
                        <div className="space-y-2">
                          {concept.examples.map((example, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700 italic">"{example}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Related Concepts</h4>
                      <div className="space-y-1">
                        {connections
                          .filter(c => c.from === selectedConcept || c.to === selectedConcept)
                          .map((connection, index) => {
                            const relatedId = connection.from === selectedConcept ? connection.to : connection.from;
                            const relatedConcept = conceptNodes.find(n => n.id === relatedId);
                            
                            return relatedConcept ? (
                              <button
                                key={index}
                                onClick={() => setSelectedConcept(relatedId)}
                                className="block w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                {relatedConcept.label} ({connection.relationship})
                              </button>
                            ) : null;
                          })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700">Primary Concepts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Secondary Concepts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
              <span className="text-gray-700">Supporting Concepts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateRelationship(): string {
  const relationships = [
    'relates to',
    'influences',
    'depends on',
    'contrasts with',
    'supports',
    'exemplifies',
    'builds upon'
  ];
  return relationships[Math.floor(Math.random() * relationships.length)];
}