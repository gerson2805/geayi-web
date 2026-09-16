const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
['state.js','i18n.js','audio.js','vehicles.js','world.js','family.js','player.js','online.js','travel.js','phase3.js','trophies.js']
  .forEach(f => vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), global.sandbox, { filename: f }));
R('initThree(); Particles.init(); Avatar.build();');
for (const z of [-1, 1]) {
  R('LEVEL=buildLevel(0); MODE="play"; Player.reset(0,2,0); Vehicle.mode="none"; { const q=LEVEL.planes[0]; Player.pos.set(q.x,q.y+1,q.z); boardVehicle({type:"plane",def:q}); }');
  const y = R('(function(){ for(let i=0;i<180;i++) updateVehicle(0.016,{x:0,z:' + z + '}); return Player.pos.y; })()');
  console.log('input.z=' + z + ' -> y=' + y.toFixed(1));
}
