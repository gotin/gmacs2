var $input = $('#input');
var input = $input.get(0);
var $d = $(document);
var $footer = $('#footer');
var $body = $('html,body');
$(function(){
  $input.val('');
  var ime = false;
  input.focus();
  $input.blur(function(){input.focus();}).focusout(function(){input.focus();});
  setInterval(function(){$('#input:focus').length == 0 ? input.focus() : '';}, 100);
  var keyEventMap = {};
  var modes = {default: keyEventMap};
  var current_mode = 'default';
  var buffers = {'*scratch*' : new Buffer('#editor')};
  var current_buffer_title = '*scratch*';
  var buffer = buffers[current_buffer_title];


  var past_input = null;
  var keyDown = null;
  var keyDownHit = false;

  prepareKeyEventMap();

  function invokeHandler(input){
    if(past_input){
      past_input = input = past_input + input;
      $footer.text(past_input);
    }
    var func = modes[current_mode][input];
    if(func){
      func({buffer:buffer});
      var pos = buffer.getCursorPosition();
      $footer.text('(' + pos.row+','+pos.column+')');
    } else {
      past_input = null;
      $footer.text('');
    }
  }

  $d.bind('compositionstart', function(e){
    ime = true;
    $input.css(buffer.$c.position());
    $input.css('z-index', '100');
  }).bind('compositionend', function(e){
    
    var timer = setInterval(function(){
      if(!ime){
        $input.val().split('').forEach(function(c){buffer.insertChar(c);});
        $input.val('');
        clearInterval(timer);
        $input.css('z-index', '1');
        var pos = buffer.getCursorPosition();
        $footer.text('(' + pos.row+','+pos.column+')');
      }
    },10);
    ime = false;
  });;

  $d.keypress(function(e){
    var mod = (e.altKey ? 'A' : '') + (e.shiftKey ? 'S' : '') + (e.metaKey ? 'M' : '') + (e.ctrlKey ? 'C' : '');
    if(!keyDownHit || mod){
      var char = String.fromCharCode(e.charCode);
      var input = null;
      if(mod.match(/(A|M|C){1,3}/)){
        input = mod + '-' + String.fromCharCode(keyDown).toLowerCase();
        keyDown = null;
      } else {
        input = mod ? mod + '-' + char : char;
      }
      if(input){
        // console.log('charCode: ' + e.charCode);
        // console.log('keyCode: ' + e.keyCode);
        // console.log('converted char: ' + char);
        // console.log('char: ' + e.char);
        // console.log('key: ' + e.key);
        // console.log('input: ' + input);
        // console.log('---');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        invokeHandler(input);
      }
    }
    keyDownHit = false;
  }).keydown(function(e){
    var mod = (e.altKey ? 'A' : '') + (e.shiftKey ? 'S' : '') + (e.metaKey ? 'M' : '') + (e.ctrlKey ? 'C' : '');
    keyDown = e.keyCode;

    var input = null;
    if(mod.match(/(A|M|C){1,3}/)){
      input = mod + '-' + String.fromCharCode(keyDown).toLowerCase();
      keyDown = null;
    } else {
      input = vkCodeMap[keyDown];
    }
    // console.log('keydown: ' + keyDown);

    if(input){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if(past_input){
        input = past_input + input;
      }
      var func = modes[current_mode][input];
      if(func){
        func({buffer:buffer});
        var pos = buffer.getCursorPosition();
        $footer.text('(' + pos.row+','+pos.column+')');
      } else {
        
        keyDownHit = !!keyDown;
      }
    }
  });
  
  function prepareKeyEventMap(){
    prepareBasicKeyInputHandler();
    prepareCursorOperationHandler();
    prepareCombinationSequences();
    
    function prepareBasicKeyInputHandler(){
      for(var code=32;code <= 126; code++){
        var char = String.fromCharCode(code);
        // console.log(char);
        var handler = generateKeyInputHandler(char);
        keyEventMap[char] = handler;
        keyEventMap['S-' + char] = handler;
      }
      keyEventMap['C-m'] = keyEventMap['Enter'] = generateKeyInputHandler(buffer.lineDelimiter || '\n');
      keyEventMap['C-h'] = keyEventMap['Backspace'] = backspace;
      keyEventMap['C-d'] = keyEventMap['Del'] = deleteChar;
    }

    function prepareCombinationSequences(){
      setKeepSequenceHandler('C-x');
      setKeepSequenceHandler('C-c');
      keyEventMap['C-xk'] = reset;
    }

    function setKeepSequenceHandler(sequence){
      keyEventMap[sequence] = function(opt){
        past_input = sequence;
        $footer.text(past_input);
        // console.log(past_input);
      };
    }

    function generateKeyInputHandler(char){
      return function(opt){
        // console.log('#' + char + '#');
        var buffer = opt.buffer;
        buffer.insertChar(char);
      };
    }

    function reset(opt){
      var buffer = opt.buffer;
      buffer.reset();
    }

    function backspace(opt){
      var buffer = opt.buffer;
      buffer.backspace();
    }

    function deleteChar(opt){
      var buffer = opt.buffer;
      buffer.delete();
    }

    function prepareCursorOperationHandler(){
      keyEventMap['C-b'] = keyEventMap['Left'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorHorizontally(-1);
      };
      keyEventMap['C-f'] = keyEventMap['Right'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorHorizontally(+1);
      };
      keyEventMap['C-p'] = keyEventMap['Up'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorVertically(-1);
      };
      keyEventMap['C-n'] = keyEventMap['Down'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorVertically(+1);
      };
      keyEventMap['C-a'] = keyEventMap['Home'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorToBOL();
      };
      keyEventMap['C-e'] = keyEventMap['End'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorToEOL();
      };
      
    }
    
  }




});

function Buffer(selector){
  this.init.apply(this, arguments);
};

function generate_uuid(){
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4() +S4());
  function S4 () {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }
}

Buffer.prototype.reset = function(){
  var uuid = this.uuid;
  var $e = this.$editor;
  $e.html('<div id="BOF_'+uuid+'" class="BOF"></div><div class="line current"><div class="cursor" id="cursor_'+uuid+'">&nbsp;</div></div><div id="EOF_'+uuid+'" class="EOF"></div>');
  this.uuid = uuid;
  this.$c = $('#cursor_' + uuid);
  this.$BOF = $('#BOF_' + uuid);
  this.$EOF = $('#EOF_' + uuid);
  this.cursorX = -1;
  this.enabled = true;
  this.scrollToCursor(-1);
};

Buffer.prototype.init = function(selector){
  this.$editor = $(selector);
  this.uuid = generate_uuid();
  this.reset();
};


Buffer.prototype.insertLineDelimiter = function(){
  if(!this.enabled) return;
  var $c = this.$c;
  var next = $c.before('<div class="char line_delimiter"><br />\n</div>')
    .parent('div.line').removeClass('current')
    .after('<div class="line current"></div>')
    .next('div.line')
    .append($('div.cursor, div.cursor ~ div.char, div.cursor'));
//    .append($c);
  this.scrollToCursor(+1);
};

Buffer.prototype.insertChar = function(c){
  if(!this.enabled) return;
  // console.log(c);
  var $c = this.$c;
  this.cursorX = -1;
  if(c == (this.lineDelimiter || '\n')){
    this.insertLineDelimiter();
  } else {
    if(c == ' '){
      $c.before('<div class="char normal space">&nbsp;</div>');
    } else {
      $c.before('<div class="char normal"></div>')
        .prev().text(c);
    }
  }
};
Buffer.prototype.backspace = function(){
  if(!this.enabled) return;
  var $c = this.$c;
  this.cursorX = -1;
  var $prev = $c.prev('div.char.normal');
  if($prev.length == 0){
    var $line = $c.parent('div.line');
    var $preLine = $line.prev('div.line');
    if($preLine.length > 0){
      $('div.char.line_delimiter', $preLine).remove();
      $preLine.addClass('current');
      $preLine.append($c);
      $line.remove();
      this.scrollToCursor(-1);
    }
  } else {
    $prev.remove();
  }
};

Buffer.prototype.delete = function(){
  if(!this.enabled) return;
  var $c = this.$c;
  this.cursorX = -1;
  var $next = $c.next('div.char.normal');
  if($next.length == 0){
    var $line = $c.parent('div.line');
    var $nextLine = $line.next('div.line');
    if($nextLine.length > 0){
      $('div.char.line_delimiter', $line).remove();
      $line.append($nextLine.children());
      $nextLine.remove();
    }
  } else {
    $next.remove();
  }
};

Buffer.prototype.moveCursorToBOL = function(){
  if(!this.enabled) return;
  var $c = this.$c;
  this.cursorX = -1;
  var $line = $c.parent('div.line');
  $('div.char.normal', $line).first().before($c);
};

Buffer.prototype.moveCursorToEOL = function(){
  if(!this.enabled) return;
  var $c = this.$c;
  this.cursorX = -1;
  var $line = $c.parent('div.line');
  $('div.char.normal', $line).last().after($c);
};


Buffer.prototype.moveCursorHorizontally = function(n){
  if(!this.enabled) return;
  var $c = this.$c;
  this.cursorX = -1;
  var $line = $c.parent('div.line');
  var up_or_down = 0;
  if(n<0){
    var $prev = $c.prev('div.char');
    if($prev.length > 0){
      $c.prev().before($c);
    } else {
      var $preLine = $line.prev('div.line');
      if($preLine.length > 0){
        var $chars = $('div.char.normal', $preLine);
        if($chars.length > 0){
          $chars.last().after($c);
        } else {
          $preLine.prepend($c);
        }
        $line.removeClass('current');
        $preLine.addClass('current');
        up_or_down = -1;
      }
    }
  } else if(n>0){
    var $next = $c.next('div.char.normal');
    if($next.length > 0){
      $c.next().after($c);
    } else {
      var $nextLine = $line.next('div.line');
      if($nextLine.length > 0){
        $nextLine.prepend($c);
        $line.removeClass('current');
        $nextLine.addClass('current');
        up_or_down = +1;
      }
    }
  }
  this.scrollToCursor(up_or_down);
};

Buffer.prototype.scrollToCursor = function(up_or_down){
  // up : -1
  // down : +1
  var $c = this.$c;
  if(up_or_down != -1 && up_or_down != 1){
    return;
  }
  var $line = $c.parent('div.line');
  var line_height = $line.height() + h('margin-top') + h('border-top') + h('padding-top')
    + h('margin-bottom') + h('border-bottom') + h('padding-bottom');
  
  var top = $c.offset().top - (up_or_down > 0 ? window.innerHeight : 0)
    + (up_or_down > 0 ? 1 : -1) * line_height * 3 + (up_or_down > 0 ? $footer.height() : 0);
  // TODO: number 3 above should be customizable

  var current_top = $d.scrollTop();
  if(up_or_down > 0 && top > current_top ||
     up_or_down < 0 && top < current_top ){
    $body.animate({scrollTop: top}, 10);
  }

  function h(k){
    var sv = $line.css(k);
    var match = (sv||'').match(/^\d+/);
    var v = match ? match[0] : 0;
    return v|0;
  }
};

Buffer.prototype.moveCursorVertically = function(n){
  if(!this.enabled) return;
  var $c = this.$c;
  var $line = $c.parent('div.line');
  if(this.cursorX < 0){
    this.cursorX = $c.prevAll('div.char.normal').length;
  }
  // console.log(cursorX);
  var $targetLine = null;
      if(n<0){
        $targetLine = $line.prev('div.line');
      } else {
        $targetLine = $line.next('div.line');
      }
  if($targetLine.length > 0){
    var $targetLineChars = $('div.char.normal', $targetLine);
    if(this.cursorX == 0 || $targetLineChars.length == 0){
      $targetLine.prepend($c);
    } else {
      if($targetLineChars.length >= this.cursorX){
        $($targetLineChars.get(this.cursorX-1)).after($c);
      } else {
        $targetLineChars.last().after($c);
      }
    }
    $line.removeClass('current');
    $targetLine.addClass('current');
    this.scrollToCursor(n);
  }        
};
Buffer.prototype.lineDelimiter = '\n';

Buffer.prototype.getCursorPosition = function(){
  var $c = this.$c;
  var column = $c.prevAll('div.char.normal').length;
  var row = $c.parent('div.line').prevAll('div.line').length + 1;
  return {row: row, column: column};
};

var vkCodeMap = {
  8: 'Backspace',
  9: 'Tab',
  13: 'Enter',
  16: 'Shift',
  17: 'Control',
  18: 'Alt',
  20: 'CapsLock',
  27: 'Esc',
  32: ' ',
  33: 'PageUp',
  34: 'PageDown',
  35: 'End',
  36: 'Home',
  37: 'Left',
  38: 'Up',
  39: 'Right',
  40: 'Down',
  46: 'Del'
};


function keyMap(code){
  // console.log("code:" + code);
  var char = String.fromCharCode(code);
  if(32 <= code && code <= 126){
    ret = char;
  } else {
    ret = vkCodeMap[code];
  }
  return ret;
}   
