/*
▓█████▄  ██▀███           ▒█████  
▒██▀ ██▌▓██ ▒ ██▒        ▒██▒  ██▒
░██   █▌▓██ ░▄█ ▒        ▒██░  ██▒
░▓█▄   ▌▒██▀▀█▄          ▒██   ██░
░▒████▓ ░██▓ ▒██▒ ██▓    ░ ████▓▒░
 ▒▒▓  ▒ ░ ▒▓ ░▒▓░ ▒▓▒    ░ ▒░▒░▒░ 
 ░ ▒  ▒   ░▒ ░ ▒░ ░▒       ░ ▒ ▒░ 
 ░ ░  ░   ░░   ░  ░      ░ ░ ░ ▒  
   ░       ░       ░         ░ ░  
 ░                 ░              
 */
import * as utils from "./utils.mjs"

const MOD_NAME = "FollowMe";
const FLAG_FOLLOWING = "following";
const fCache = {};

function lang(k){
  return game.i18n.localize("FOLLOWME."+k);
}

function addFollower(leader, follower){
  if (!canvas.scene.id in fCache){
    fCache[canvas.scene.id]={};
  }
}

function strTemplate(s, o){
  for (let k of Object.keys(o)){
    s = s.replace('{'+k+'}', o[k]);
  }
  return s;
}

/**
 * @param {*} obj 
 * @returns {Boolean} true if obj is an empty object {}
 */
function emptyObj(obj){
  return (
         obj && 
         Object.keys(obj).length === 0 && 
         Object.getPrototypeOf(obj) === Object.prototype);
}

/**
 * Display a text above a token
 * @param {*} token A token object
 * @param {String} text The text to display above the token
 */
function scrollText(token, text){
  token.hud.createScrollingText(text, {
    anchor: CONST.TEXT_ANCHOR_POINTS.TOP, 
    fill:   "#FFFFFF", 
    stroke: "#FFFFFF"
  });
}

function stopFollowing( token, whom, collided = false ){
  if (collided){
    scrollText(token.object, strTemplate(lang("collided"), {name:whom}));  
  }else{
    scrollText(token.object, strTemplate(lang("stopped"), {name:whom}));
  }
  if (token.isOwner){
    token.setFlag(MOD_NAME, FLAG_FOLLOWING, null);
  }
}


// Hook into token movemen. Push 'pushables' along with this movement, and cancel movement if pushing is not possible
Hooks.on('updateToken', (token, change, options, user_id)=>{
  // Check if this is a "movement" 
  if (!hasProperty(change,'x')&&!(hasProperty(change, 'y'))){return true;}
  if (!hasProperty(options, 'by_following') && token.getFlag(MOD_NAME, FLAG_FOLLOWING)!=null){
    // This movement came from another source than this module, lets stop following
    let flw = token.getFlag(MOD_NAME, FLAG_FOLLOWING);
    let ldr = canvas.tokens.get(flw.who);
    stopFollowing(token, ldr?.name);
  }

  // Find tokens following this one
  let followers = canvas.tokens.placeables.filter( t=>{return t.document.getFlag(MOD_NAME, FLAG_FOLLOWING)?.who == token.id} );

  let p = {x:token.data.x, y:token.data.y};
  if (hasProperty(change,'x')) p.x=change.x;
  if (hasProperty(change,'y')) p.y=change.y;

  for (let follower of followers){
    if (!follower.isOwner){
      continue;
    }
    let desc = follower.document.getFlag(MOD_NAME, FLAG_FOLLOWING);
    desc.positions.push(p);
    let sp = new utils.SimpleSpline(desc.positions);

    let param = sp.plen-desc.dist;
    let new_pos = sp.parametricPosition(param);
    let data = {};

    // If snap, snap new_pos
    if (game.settings.get(MOD_NAME, 'snap_to_grid')){
      new_pos = canvas.grid.getSnappedPosition( new_pos.x, new_pos.y );
    }
    data.x = new_pos.x;
    data.y = new_pos.y;

    // If orienting, add rotation to the update
    if (game.settings.get(MOD_NAME, 'orienting')){
      let der = sp.derivative(param);
      let an = utils.vAngle(der)
      if (!isNaN(an)) data.rotation = an;
    }

    if (game.settings.get(MOD_NAME, 'collisions')){
      let ray = new Ray( follower.center, utils.vAdd(new_pos, { x: follower.bounds.width/2,
                                                                y: follower.bounds.height/2} ) );
      if (canvas.walls.checkCollision(ray)){
        stopFollowing(follower.document, token.name, true);
        // Do not apply update
        continue;
      }    
    }

    sp.prune(param);
    desc.positions = sp.p;
    data['flags.FollowMe.following'] = desc

    follower.document.update(
      data, {by_following:true});
  }

});


function follow(){
  let leader = canvas.tokens._hover;
  let followers = canvas.tokens._controlled;

  if (leader === null || emptyObj(followers)){
    return;
  }

  for (let follower of Object.keys(followers)){
    if (leader.id === follower){
      scrollText(leader, lang('followYourself'));
    }else{
      addFollower(leader.id, follower);
      let token = canvas.tokens.get(follower);
      let dist = Math.sqrt( (token.x-leader.x)**2 + (token.y-leader.y)**2);
      let distance = Math.round( canvas.scene.dimensions.distance * dist/canvas.scene.dimensions.size );

      let text = strTemplate(lang('following'), {distance:distance,
                                                 unit: canvas.scene.data.gridUnits,
                                                 name: leader.name});
      scrollText(token, text);
      token.document.setFlag(MOD_NAME, FLAG_FOLLOWING, 
        {
          who:leader.id, 
          dist:dist, 
          positions:[{x:token.x, y:token.y}, {x:leader.x, y:leader.y}]
        });
      }
  }
}


// Settings:
Hooks.once("init", () => {  
  
  game.settings.register(MOD_NAME, "snap_to_grid", {
    name: lang("snap"),
    hint: lang("snap_hint"),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });
  
  game.settings.register(MOD_NAME, "collisions", {
    name: lang("collision"),
    hint: lang("collision_hint"),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MOD_NAME, "orienting", {
    name: lang("orienting"),
    hint: lang("orienting_hint"),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });
  


  game.keybindings.register(MOD_NAME, "follow", {
    name: "FollowMe",
    hint: lang('key_hint'),
    editable: [
      {
        key: "KeyF"
      }
    ],
    onDown: () => { follow(); },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });
});


