import { Box3, ExtrudeGeometry, Vector3 } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

const LOGO_PATH_D =
  "M22.5958 21.4575L12.1834 27.5428L12.1835 27.5487L0.181268 34.571L0.0366773 7.15345L12.1123 14.0489L12.1123 14.0547L22.5883 20.0298L23.8264 20.7372L22.5958 21.4575ZM0.682804 8.19498L12.0305 20.5787L0.816368 33.5218L22.5921 20.7437L0.682804 8.19498ZM23.8293 20.7372L22.5883 20.0298L12.1123 14.0489L12.0388 0.125217L35.8549 13.7088L23.8293 20.7372ZM12.2569 41.4723L12.1835 27.5487L22.5958 21.4575L23.8293 20.7372L35.9284 27.6383L12.2569 41.4723Z";

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 42"><path d="${LOGO_PATH_D}"/></svg>`;

export const MARK_COLOR = { dark: "#e5e5e5", light: "#5a5a5a" } as const;

export function buildCaftonMarkFacets(
  scale: number,
  extrudeDepth = 6
): ExtrudeGeometry[] {
  const loader = new SVGLoader();
  const { paths } = loader.parse(LOGO_SVG);
  const shapes = paths.flatMap((path) => path.toShapes());

  const geometries = shapes.map(
    (shape) =>
      new ExtrudeGeometry(shape, {
        depth: extrudeDepth,
        bevelEnabled: false,
        curveSegments: 1,
      })
  );
  const box = new Box3();
  geometries.forEach((geometry) => {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) box.union(geometry.boundingBox);
  });
  const center = box.getCenter(new Vector3());

  geometries.forEach((geometry) => {
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(scale, scale, scale);
    geometry.rotateX(Math.PI); // SVG's Y axis points down; flip upright.
    geometry.computeVertexNormals();
  });

  return geometries;
}
