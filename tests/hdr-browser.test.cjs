const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
(async()=>{
const root=path.resolve(__dirname,'..');
const scripts=process.env.PANNELLUM_BUILD==='1'?'<script src="/build/pannellum.js"></script>':'<script src="/src/js/libpannellum.js"></script><script src="/src/js/pannellum.js"></script>';const server=http.createServer((req,res)=>{
const url=new URL(req.url,'http://test');let file=path.join(root,url.pathname);
if(url.pathname==='/test'){res.setHeader('content-type','text/html');return res.end('<link rel="stylesheet" href="/src/css/pannellum.css"><div id="view" style="width:512px;height:256px"></div>'+scripts);}
if(url.pathname==='/10k.avif')file=process.env.PANORAMA_10K_FIXTURE;
if(url.pathname==='/8k.avif')file=process.env.PANORAMA_8K_FIXTURE;
try{res.setHeader('content-type',file.endsWith('.wasm')?'application/wasm':/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');let body=fs.readFileSync(file);
res.end(body);}catch{res.statusCode=404;res.end();}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader']});
try{
const cases=[['/examples/test-hdr.avif','high',false],['/examples/test-hdr.avif','standard',false],['/tests/equirectangular.png','standard',false],['/examples/test-hdr.avif','high',true]];
if(process.env.PANORAMA_8K_FIXTURE)cases.push(['/8k.avif','high',false]);
if(process.env.PANORAMA_10K_FIXTURE)cases.push(['/10k.avif','high',false]);
for(const [panorama,range,fail] of cases){
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/test');
await page.evaluate(({panorama,range,fail})=>{
if(fail)Object.defineProperty(navigator,'gpu',{value:{requestAdapter:()=>Promise.reject(new Error('test adapter failure'))}});
window.viewer=pannellum.viewer('view',{type:'equirectangular',panorama,autoLoad:true,dynamicRange:range});
},{panorama,range,fail});
await page.waitForFunction(()=>window.viewer?.isLoaded(),null,{timeout:60000});
const d=await page.evaluate(()=>({active:viewer.getRenderer().getDynamicRange(),info:viewer.getRenderer().getHDRInfo(),diagnostics:viewer.getRenderer().getHDRDiagnostics()}));
assert.deepEqual(errors,[]);
if(panorama.endsWith('.avif')&&!fail){assert.equal(d.diagnostics.status,'ready');assert.equal(d.diagnostics.streamedPixels,true);assert.equal(d.diagnostics.browserImageDecoded,false);assert.equal(d.diagnostics.decoderMemory.rgbaCopiedToJS,false);assert.equal(d.active,range);}
if(fail){assert.equal(d.diagnostics.status,'fallback');assert.equal(d.active,'standard');}
console.log(JSON.stringify({panorama,range,fail,...d}));await page.close();
}
if(process.env.HDR_FULL_REGRESSION==='1'){
const page=await browser.newPage();
await page.goto('http://127.0.0.1:'+server.address().port+'/tests/hdr-regression.html');
await page.waitForFunction(()=>/ALL CHECKS PASSED|FAIL:/.test(document.getElementById('results').textContent),null,{timeout:60000});
const result=await page.locator('#results').textContent();assert.ok(result.includes('ALL CHECKS PASSED'),result);console.log(result);await page.close();
}
}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
