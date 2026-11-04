import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import {
  SCHEMA_ROLE_COLORS as ROLE_COLORS,
  SCHEMA_VIEW_HEIGHT,
  SCHEMA_VIEW_WIDTH,
  getSchemaElements,
  type SchemaElement,
} from '@/lib/measurements/schemaGeometry';
import type { OpeningSide } from '@/lib/measurements/types';

type Props = {
  side: OpeningSide | null;
  width?: number;
};

export function OpeningSchema({ side, width = SCHEMA_VIEW_WIDTH }: Props) {
  const height = (width * SCHEMA_VIEW_HEIGHT) / SCHEMA_VIEW_WIDTH;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${SCHEMA_VIEW_WIDTH} ${SCHEMA_VIEW_HEIGHT}`}>
      {getSchemaElements(side).map((element, index) => renderElement(element, index))}
    </Svg>
  );
}

function renderElement(element: SchemaElement, key: number) {
  const color = ROLE_COLORS[element.role];
  switch (element.kind) {
    case 'line':
      return (
        <Line
          key={key}
          x1={element.x1}
          y1={element.y1}
          x2={element.x2}
          y2={element.y2}
          stroke={color}
          strokeWidth={element.strokeWidth}
          strokeLinecap="round"
        />
      );
    case 'path':
      return (
        <Path
          key={key}
          d={element.d}
          fill="none"
          stroke={color}
          strokeWidth={element.strokeWidth}
          strokeDasharray={element.dashed ? '4 4' : undefined}
        />
      );
    case 'circle':
      return <Circle key={key} cx={element.cx} cy={element.cy} r={element.r} fill={color} />;
    case 'rect':
      return (
        <Rect
          key={key}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={2}
          fill={color}
        />
      );
    case 'text':
      return (
        <SvgText key={key} x={element.x} y={element.y} textAnchor="middle" fontSize={8} fill={color}>
          {element.text}
        </SvgText>
      );
  }
}
