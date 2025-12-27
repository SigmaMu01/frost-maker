import { INode } from 'svgson';

export interface mapSVG {
  name: 'svg'; // Check
  attributes: {
    // version: '1.1'; // Check
    viewBox: string; // Canvas size in px (cm)
    [key: string]: string | undefined;
  };
  children: mapSVGchild[];
}

export interface mapSVGchild {
  /*
    Layers have no attributes, their name is important
    Shapes have attributes, their name is not important
  */

  name: string; // Layer name
  children: mapSVGchild[];
  attributes?: {
    // Single shape on the canvas
    class: string;
    height: string;
    width: string;
    x: string;
    y: string;
    [key: string]: string | undefined;
  };
}

export function isValidSVG(template: INode) {
  if (template.name !== 'svg') {
    console.error('Wrong document type: SVG expected.');
  }
  return true;
}
