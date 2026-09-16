const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
['state.js','i18n.js','audio.js','vehicles.js','world.js', 'neoncity.js','family.js','player.js','online.js','travel.js','phase3.js','trophies.js']
  .forEach(f => vm.runInContext(fs.readFileSync(DIR+f,'utf8'), global.sandbox, {filename:f}));
R('initThree(); Particles.init(); Avatar.build(); LEVEL=buildLevel(0); MODE="play"; Player.reset(0,2,0);');
R('SAVE.chute = true');
// caída libre desde lo alto
const dep = R(`(function(){
  Player.pos.set(0, 40, 100); Player.vel.set(0, 0, 0); Player.grounded = false;
  Chute.leaveY = 40;
  for (let i = 0; i < 200 && !Chute.deployed; i++) { Player.vel.y -= 30*0.016; Player.pos.y += Player.vel.y*0.016; updateChute(0.016); }
  return Chute.deployed;
})()`);
console.log('paracaídas se despliega en caída libre:', dep ? 'OK' : '✗ FAIL');
const slow = R(`(function(){
  let maxFall = 0;
  for (let i = 0; i < 200; i++) { Player.vel.y -= 30*0.016; if (Chute.deployed) Player.vel.y = Math.max(Player.vel.y, -6); Player.pos.y += Player.vel.y*0.016; maxFall = Math.min(maxFall, Player.vel.y); updateChute(0.016); }
  return maxFall;
})()`);
console.log('velocidad máx de caída con paracaídas:', slow.toFixed(1), slow > -9 ? 'OK (cae despacio)' : '✗ FAIL (cae muy rápido)');
