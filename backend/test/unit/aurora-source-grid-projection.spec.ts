import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
const execFileAsync=promisify(execFile); const url=pathToFileURL(resolve(__dirname,"../../scripts/lib/aurora-source-grid-projection.mjs")).href;
async function run(source:string){const{stdout}=await execFileAsync("node",["--input-type=module","-e",`import * as p from ${JSON.stringify(url)}; console.log(JSON.stringify(await (async()=>{${source}})()));`]);return JSON.parse(stdout);}
const sample=(x:number,y:number)=>({status:"verified",evidenceKind:"source-targeted-visual-selection/v1",sourceTile:{index:y*10+x,x,y,tileId:197,orientation:1},selectionCenter:{x:100+20*x-5*y,y:200+3*x+25*y}});
describe("Aurora source-grid projection",()=>{
 it("fits and projects a source tile from three target-verified selections",async()=>{const result=await run(`const fit=p.fitAuroraSourceGridProjection({samples:${JSON.stringify([sample(0,0),sample(1,0),sample(0,1),sample(2,1)])}}); return {fit,next:p.projectAuroraSourceTile({projection:fit,tile:{x:2,y:3},viewportBounds:{width:1000,height:800}})};`); expect(result.fit).toMatchObject({status:"estimated",maxResidualPixels:0}); expect(result.next).toMatchObject({status:"projected",projectedCenter:{x:125,y:281}});});
 it("blocks a projection which does not explain all confirmed selections",async()=>{const bad=sample(2,1);bad.selectionCenter.x+=40;const result=await run(`return p.fitAuroraSourceGridProjection({samples:${JSON.stringify([sample(0,0),sample(1,0),sample(0,1),bad])},maxResidualPixels:5});`);expect(result).toMatchObject({status:"blocked",blockerCode:"source_grid_projection_residual_too_large"});});
 it("never projects a target outside the viewport",async()=>{const result=await run(`const fit=p.fitAuroraSourceGridProjection({samples:${JSON.stringify([sample(0,0),sample(1,0),sample(0,1)])}}); return p.projectAuroraSourceTile({projection:fit,tile:{x:99,y:99},viewportBounds:{width:300,height:300},marginPixels:10});`);expect(result).toMatchObject({status:"blocked",blockerCode:"source_grid_projection_target_outside_viewport"});});
});
