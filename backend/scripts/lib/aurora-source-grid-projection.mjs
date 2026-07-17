/** Fits source tile (x,y) to local viewport pixels from verified selections. */
export function fitAuroraSourceGridProjection({ samples, maxResidualPixels = 8 }) {
  const points = (samples ?? []).map(normalizeSample);
  if (points.length < 3) return blocked("source_grid_projection_samples_missing", "At least three verified source-targeted selections are required.");
  const basis = findNonCollinearTriplet(points);
  if (!basis) return blocked("source_grid_projection_degenerate", "Source selection samples are collinear; a 2D projection cannot be fitted.");
  const xCoefficients = solve3(basis.map((point) => [point.x, point.y, 1]), basis.map((point) => point.screenX));
  const yCoefficients = solve3(basis.map((point) => [point.x, point.y, 1]), basis.map((point) => point.screenY));
  const residuals = points.map((point) => {
    const projected = projectWithCoefficients(point, xCoefficients, yCoefficients);
    return { tile: point.tile, actual: { x: point.screenX, y: point.screenY }, projected, errorPixels: round(Math.hypot(projected.x - point.screenX, projected.y - point.screenY)) };
  });
  const maxErrorPixels = Math.max(...residuals.map((entry) => entry.errorPixels));
  if (maxErrorPixels > Number(maxResidualPixels)) return blocked("source_grid_projection_residual_too_large", "One affine source-grid projection does not explain the verified selections.", { maxErrorPixels, maxResidualPixels: Number(maxResidualPixels), residuals });
  return {
    status: "estimated",
    version: "aurora-source-grid-projection/v1",
    coefficients: { screenX: vector(xCoefficients), screenY: vector(yCoefficients) },
    sampleCount: points.length,
    maxResidualPixels: maxErrorPixels,
    acceptanceTolerancePixels: Number(maxResidualPixels),
    samples: points.map(({ tile, x, y, screenX, screenY }) => ({ tile, source: { x, y }, selectionCenter: { x: screenX, y: screenY } })),
  };
}

export function projectAuroraSourceTile({ projection, tile, viewportBounds = null, marginPixels = 0 }) {
  if (projection?.status !== "estimated" || projection?.version !== "aurora-source-grid-projection/v1") throw codedError("source_grid_projection_required", "Accepted source-grid projection is required.");
  if (!Number.isInteger(Number(tile?.x)) || !Number.isInteger(Number(tile?.y))) throw codedError("source_grid_projection_tile_invalid", "Integer source tile x and y are required.");
  const x = Number(tile.x), y = Number(tile.y);
  const screen = { x: round(projection.coefficients.screenX.x * x + projection.coefficients.screenX.y * y + projection.coefficients.screenX.offset), y: round(projection.coefficients.screenY.x * x + projection.coefficients.screenY.y * y + projection.coefficients.screenY.offset) };
  if (viewportBounds && !insideViewport(screen, viewportBounds, Number(marginPixels))) return blocked("source_grid_projection_target_outside_viewport", "Projected source tile centre is outside the safe viewport bounds.", { tile: { x, y }, projectedCenter: screen, viewportBounds, marginPixels: Number(marginPixels) });
  return { status: "projected", tile: { ...tile, x, y }, projectedCenter: screen, projectionVersion: projection.version };
}

function normalizeSample(value) {
  const sourceTargeted = value?.evidenceKind === "source-targeted-visual-selection/v1";
  const tile = sourceTargeted ? value?.sourceTile : (value?.tile ?? value);
  if (value?.status !== "verified" || !Number.isInteger(Number(tile?.x)) || !Number.isInteger(Number(tile?.y)) || !finitePoint(value?.selectionCenter)) throw codedError("source_grid_projection_sample_invalid", "Each sample requires verified exact tile-selection evidence and finite selectionCenter.");
  return { tile: { index: Number(tile.index), x: Number(tile.x), y: Number(tile.y), tileId: Number(tile.tileId), orientation: Number(tile.orientation) }, x: Number(tile.x), y: Number(tile.y), screenX: Number(value.selectionCenter.x), screenY: Number(value.selectionCenter.y) };
}
function findNonCollinearTriplet(points) { for (let i=0;i<points.length;i+=1) for (let j=i+1;j<points.length;j+=1) for (let k=j+1;k<points.length;k+=1) { const a=points[i],b=points[j],c=points[k]; if (Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))>1e-9) return [a,b,c]; } return null; }
function solve3(matrix, rhs) { const a=matrix.map((row,index)=>[...row,rhs[index]]); for(let col=0;col<3;col+=1){ let pivot=col; for(let row=col+1;row<3;row+=1)if(Math.abs(a[row][col])>Math.abs(a[pivot][col]))pivot=row; if(Math.abs(a[pivot][col])<1e-9)throw codedError("source_grid_projection_singular","Projection basis is singular."); [a[col],a[pivot]]=[a[pivot],a[col]]; const scale=a[col][col]; for(let x=col;x<4;x+=1)a[col][x]/=scale; for(let row=0;row<3;row+=1){if(row===col)continue; const factor=a[row][col]; for(let x=col;x<4;x+=1)a[row][x]-=factor*a[col][x];}} return a.map((row)=>row[3]); }
function projectWithCoefficients(point,x,y){return{x:round(x[0]*point.x+x[1]*point.y+x[2]),y:round(y[0]*point.x+y[1]*point.y+y[2])};}
function vector(values){return{x:round(values[0]),y:round(values[1]),offset:round(values[2])};}
function insideViewport(point,bounds,margin){const left=Number(bounds.left??0)+margin,top=Number(bounds.top??0)+margin,right=Number(bounds.right??(Number(bounds.left??0)+Number(bounds.width)))-margin,bottom=Number(bounds.bottom??(Number(bounds.top??0)+Number(bounds.height)))-margin; return point.x>=left&&point.x<=right&&point.y>=top&&point.y<=bottom;}
function finitePoint(value){return Number.isFinite(Number(value?.x))&&Number.isFinite(Number(value?.y));}
function round(value){return Math.round(value*1000)/1000;}
function blocked(blockerCode,reason,details=undefined){return{status:"blocked",blockerCode,reason,...(details===undefined?{}:{details})};}
function codedError(code,message){const error=new Error(message);error.code=code;return error;}
