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


// Hook into token movemen. Push 'pushables' along with this movement, and cancel movement if pushing is not possible
Hooks.on('updateToken', (token, change, options, user_id)=>{
  // Check if this is a "movement" 
  if (!hasProperty(change,'x')&&!(hasProperty(change, 'y'))){return true;}
  if (!hasProperty(options, 'by_following') && token.getFlag(MOD_NAME, FLAG_FOLLOWING)!=null){
    // This movement came from another source than this module, lets stop following
    let flw = token.getFlag(MOD_NAME, FLAG_FOLLOWING);
    let ldr = canvas.tokens.get(flw.who);
    scrollText(token.object, strTemplate(lang("stopped"), {name:ldr?.name}));
    if (token.isOwner){
      token.setFlag(MOD_NAME, FLAG_FOLLOWING, null);
    }
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
    let new_pos = sp.parametricPosition(sp.plen-desc.dist);
    sp.prune(sp.plen-desc.dist);
    desc.positions = sp.p;

    follower.document.update(
      {
        x: new_pos.x, 
        y: new_pos.y,
        'flags.FollowMe.following': desc
      }, {by_following:true});
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
          positions:[{x:leader.x, y:leader.y
        }]});
      }
  }
}


// Settings:
Hooks.once("init", () => {
  /*
  game.settings.register(MOD_NAME, "snap_to_grid", {
    name: "Snap to grid",
    hint: "Should the tokens automatically snap to grid, or preserve length",
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });
  */

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


