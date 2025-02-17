import { SphericalMercator } from "@mapbox/sphericalmercator";
import Canvas from "canvas";

// ppe values related to color classes

const COLOR_FIRST_STEP = 0.6;
const COLOR_SECOND_STEP = 2;
const COLOR_THIRD_STEP = 4;

const CIRCLE_RADIUS = 4;

export const drawFeatures = (
  zoom: number,
  bbox: [number, number, number, number],
  features: Array<{ ppe: number; loc: { coordinates: [number, number] } }>,
): Promise<Buffer> => {
  const sphericalMercator = new SphericalMercator({});
  const canvas = Canvas.createCanvas(256, 256);
  const context = canvas.getContext("2d");

  // absolute pixel position of the border box NE and SW vertexes
  const sw = sphericalMercator.px([bbox[0], bbox[1]], Number(zoom));
  const ne = sphericalMercator.px([bbox[2], bbox[3]], Number(zoom));

  for (const feature of features) {
    // average street quality indicator
    const { ppe } = feature;

    let red = 0,
      green = 0,
      blue = 0;
    let light = 255,
      pitch;

    if (ppe <= COLOR_FIRST_STEP) {
      red = (1 / COLOR_FIRST_STEP) * ppe;
      green = 1;
      light = 127 + 128 * (1 / COLOR_FIRST_STEP) * ppe;
    } else if (ppe > COLOR_FIRST_STEP && ppe < COLOR_SECOND_STEP) {
      pitch = COLOR_SECOND_STEP - COLOR_FIRST_STEP;
      red = 1;
      green = (-1 / pitch) * ppe + COLOR_SECOND_STEP / pitch;
    } else if (ppe < COLOR_THIRD_STEP) {
      pitch = COLOR_THIRD_STEP - COLOR_SECOND_STEP;
      red = 1;
      blue = Math.min(1, (ppe - pitch) / pitch);
    }

    red = Math.floor(red * 255);
    green = Math.floor(green * light);
    blue = Math.floor(blue * 255);

    const color = `rgba(${red}, ${green}, ${blue}, 0.9)`;

    const lon = feature.loc.coordinates[0];
    const lat = feature.loc.coordinates[1];

    // absolute pixel position of the feature
    const absPos = sphericalMercator.px([lon, lat], Number(zoom));

    // position of the point inside the tile
    const relPos = [absPos[0] - sw[0], absPos[1] - ne[1]];

    context.beginPath();
    context.fillStyle = color;
    context.arc(relPos[0], relPos[1], CIRCLE_RADIUS, 0, Math.PI * 2);
    context.closePath();
    context.fill();
  }

  const chunks: Uint8Array[] = [];

  return new Promise<Buffer>((res) => {
    canvas
      .createPNGStream()
      .on("data", function (chunk) {
        chunks.push(chunk);
      })
      .on("end", function () {
        const buf = Buffer.concat(chunks);
        res(buf);
      });
  });
};
