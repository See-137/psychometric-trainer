import React from 'react';

interface GeometricElement {
  type: 'point' | 'line' | 'angle' | 'triangle' | 'rectangle' | 'circle' | 'parallelLines';
  id: string;
  coordinates?: { x: number; y: number };
  points?: string[];
  angle?: number;
  label?: string;
  value?: string;
}

interface VisualContentParserProps {
  content: string;
  className?: string;
}

/**
 * Component that parses and renders visual mathematical content
 * Handles geometric diagrams, coordinate systems, and visual elements referenced in questions
 */
export const VisualContentParser: React.FC<VisualContentParserProps> = ({
  content,
  className = ''
}) => {
  // Parse visual content from text
  const parseVisualContent = (text: string): GeometricElement[] => {
    const elements: GeometricElement[] = [];
    
    // Clean the text for better pattern matching
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Look for coordinate patterns like "28406 A BC D E a b c x"
    const coordinatePattern = /\d{5}\s+([A-Z\s]+)([a-z\s]+)([x-z\s]*)/;
    const coordinateMatch = cleanText.match(coordinatePattern);
    
    if (coordinateMatch) {
      const upperPoints = coordinateMatch[1].trim().split(/\s+/).filter(p => p.length === 1 && /[A-Z]/.test(p));
      const lowerPoints = coordinateMatch[2].trim().split(/\s+/).filter(p => p.length === 1 && /[a-z]/.test(p));
      
      // Create upper case points (usually geometric vertices)
      upperPoints.forEach((point, index) => {
        elements.push({
          type: 'point',
          id: point,
          coordinates: {
            x: 80 + (index * 50),
            y: 60 + (Math.sin(index * 0.8) * 40)
          },
          label: point
        });
      });
      
      // Create lower case points (usually line labels)
      lowerPoints.forEach((point, index) => {
        elements.push({
          type: 'line',
          id: `line-${point}`,
          coordinates: {
            x: 50,
            y: 120 + (index * 30)
          },
          label: point
        });
      });
      
      // Handle parallel lines
      if (text.includes('מקבילים') || text.includes('parallel')) {
        elements.push({
          type: 'parallelLines',
          id: 'parallel-lines',
          points: lowerPoints
        });
      }
      
      // Create triangle if we have A, B, C
      if (upperPoints.includes('A') && upperPoints.includes('B') && upperPoints.includes('C')) {
        elements.push({
          type: 'triangle',
          id: 'triangle-ABC',
          points: ['A', 'B', 'C']
        });
      }
      
      // Create rectangle if we have A, B, C, D
      if (upperPoints.includes('A') && upperPoints.includes('B') && 
          upperPoints.includes('C') && upperPoints.includes('D')) {
        elements.push({
          type: 'rectangle',
          id: 'rectangle-ABCD',
          points: ['A', 'B', 'C', 'D']
        });
      }
    }
    
    // Look for angle patterns
    if (text.includes('x =') || text.includes('x=')) {
      elements.push({
        type: 'angle',
        id: 'angle-x',
        label: 'x',
        coordinates: { x: 150, y: 100 }
      });
    }
    
    // Look for circle patterns
    if (text.includes('מעגל') || text.includes('circle')) {
      elements.push({
        type: 'circle',
        id: 'circle-main',
        coordinates: { x: 150, y: 100 }
      });
    }
    
    return elements;
  };

  // Check if content has visual elements
  const hasVisualContent = (text: string): boolean => {
    const visualKeywords = [
      'בסרטוט', 'diagram', 'triangle', 'מעמים', 'בנקודה', 'קואורדינטות',
      'מקבילים', 'parallel', 'ריבוע', 'square', 'מלבן', 'rectangle', 
      'מעגל', 'circle', 'משולש', 'זווית', 'angle'
    ];
    
    return visualKeywords.some(keyword => text.includes(keyword)) || 
           /\d{5}\s+[A-Z]/.test(text) ||
           /[x-z]\s*=/.test(text);
  };

  const renderGeometricDiagram = (elements: GeometricElement[]): React.JSX.Element => {
    if (elements.length === 0) return <></>;

    // Check what type of diagram this is
    const hasTriangle = elements.some(e => e.type === 'triangle');
    const hasRectangle = elements.some(e => e.type === 'rectangle');
    const hasCircle = elements.some(e => e.type === 'circle');
    const hasParallelLines = elements.some(e => e.type === 'parallelLines');
    
    let diagramTitle = 'תרשים';
    if (hasParallelLines) diagramTitle = 'קווים מקבילים';
    else if (hasTriangle) diagramTitle = 'משולש';
    else if (hasRectangle) diagramTitle = 'מלבן/ריבוע';
    else if (hasCircle) diagramTitle = 'מעגל';

    return (
      <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="text-sm font-medium text-blue-700 mb-3 text-center">{diagramTitle}</div>
        <svg
          width="320"
          height="220"
          viewBox="0 0 320 220"
          className="mx-auto bg-white rounded-lg border border-gray-200 shadow-sm"
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="15" height="15" patternUnits="userSpaceOnUse">
              <path
                d="M 15 0 L 0 0 0 15"
                fill="none"
                stroke="#f8fafc"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Render parallel lines first (background) */}
          {elements
            .filter(e => e.type === 'parallelLines')
            .map((element) => (
              <g key={element.id}>
                <line
                  x1={30}
                  y1={80}
                  x2={290}
                  y2={80}
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeDasharray="none"
                />
                <text
                  x={15}
                  y={75}
                  fontSize="14"
                  fill="#475569"
                  fontFamily="Arial, sans-serif"
                >
                  {element.points?.[0] || 'a'}
                </text>
                <line
                  x1={30}
                  y1={140}
                  x2={290}
                  y2={140}
                  stroke="#64748b"
                  strokeWidth="2"
                />
                <text
                  x={15}
                  y={135}
                  fontSize="14"
                  fill="#475569"
                  fontFamily="Arial, sans-serif"
                >
                  {element.points?.[1] || 'b'}
                </text>
                
                {/* Transversal line */}
                <line
                  x1={120}
                  y1={60}
                  x2={180}
                  y2={160}
                  stroke="#374151"
                  strokeWidth="2.5"
                />
              </g>
            ))}
          
          {/* Render geometric shapes */}
          {elements
            .filter(e => e.type === 'triangle')
            .map((element) => {
              const points = element.points?.map(pointId => 
                elements.find(e => e.id === pointId && e.coordinates)
              ).filter(Boolean);
              
              if (points && points.length >= 3) {
                const pathData = points
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p!.coordinates!.x} ${p!.coordinates!.y}`)
                  .join(' ') + ' Z';
                
                return (
                  <path
                    key={element.id}
                    d={pathData}
                    fill="rgba(34, 197, 94, 0.1)"
                    stroke="#22c55e"
                    strokeWidth="2.5"
                  />
                );
              }
              
              // Default triangle
              return (
                <polygon
                  key={element.id}
                  points="160,50 120,150 200,150"
                  fill="rgba(34, 197, 94, 0.1)"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                />
              );
            })}
            
          {elements
            .filter(e => e.type === 'rectangle')
            .map((element) => (
              <rect
                key={element.id}
                x={100}
                y={80}
                width={120}
                height={80}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="#3b82f6"
                strokeWidth="2.5"
              />
            ))}
            
          {elements
            .filter(e => e.type === 'circle')
            .map((element) => (
              <circle
                key={element.id}
                cx={element.coordinates?.x || 160}
                cy={element.coordinates?.y || 110}
                r="50"
                fill="rgba(168, 85, 247, 0.1)"
                stroke="#a855f7"
                strokeWidth="2.5"
              />
            ))}
          
          {/* Render points */}
          {elements
            .filter(e => e.type === 'point')
            .map((element) => {
              if (!element.coordinates) return null;
              return (
                <g key={element.id}>
                  <circle
                    cx={element.coordinates.x}
                    cy={element.coordinates.y}
                    r="4"
                    fill="#1f2937"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  {element.label && (
                    <text
                      x={element.coordinates.x + 10}
                      y={element.coordinates.y - 8}
                      fontSize="14"
                      fontWeight="bold"
                      fill="#1f2937"
                      fontFamily="Arial, sans-serif"
                    >
                      {element.label}
                    </text>
                  )}
                </g>
              );
            })}
          
          {/* Render angles */}
          {elements
            .filter(e => e.type === 'angle')
            .map((element) => {
              const x = element.coordinates?.x || 160;
              const y = element.coordinates?.y || 110;
              
              return (
                <g key={element.id}>
                  <path
                    d={`M ${x-15},${y} A 15,15 0 0,1 ${x},${y-15}`}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3"
                  />
                  <text
                    x={x - 25}
                    y={y - 5}
                    fontSize="16"
                    fontWeight="bold"
                    fill="#ef4444"
                    fontFamily="Arial, sans-serif"
                  >
                    {element.label}
                  </text>
                </g>
              );
            })}
        </svg>
        
        {/* Legend */}
        <div className="mt-3 text-xs text-gray-600 text-center space-y-1">
          {hasParallelLines && <div>קווים a ו-b מקבילים</div>}
          {content.includes('x =') && <div className="text-red-600">זווית x מסומנת באדום</div>}
          {content.includes('נפגשים בנקודה') && <div>קווים נפגשים בנקודה משותפת</div>}
        </div>
      </div>
    );
  };

  // Parse content and render if visual elements found
  const visualElements = hasVisualContent(content) ? parseVisualContent(content) : [];
  
  if (visualElements.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {renderGeometricDiagram(visualElements)}
    </div>
  );
};

export default VisualContentParser;