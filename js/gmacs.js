$(function(){
  var keyEventMap = {};
  var buffer = new Buffer();
  var $d = $(document);
  var $e = $('#editor');
  var $c = $('#cursor');
  var $BOF = $('#BOF');
  var $EOF = $('#EOF');
  var BOF = $BOF[0];
  var EOF = $EOF[0];
  var keyDownHit = false;
  prepareKeyEventMap();
  
  function invokeHandler(input){
    var func = keyEventMap[input];
    if(func){
      func({buffer:buffer});
    }
  }

  $d.keypress(function(e){
    var mod = (e.altKey ? 'A' : '') + (e.shiftKey ? 'S' : '') + (e.metaKey ? 'M' : '') + (e.ctrlKey ? 'C' : '');
    if(!keyDownHit || mod){
      var input = (mod ? mod + '-' : '') + String.fromCharCode(e.charCode);
      if(input){
        console.log(input);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        invokeHandler(input);
      }
    }
    keyDownHit = false;
  }).keydown(function(e){
    var input = vkCodeMap[e.keyCode];
    console.log('keydown: ' + input);
    if(input){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      var func = keyEventMap[input];
      if(func){
        func({buffer:buffer});
      } else {
        keyDownHit = true;
      }
    }
  });
  
  function prepareKeyEventMap(){
    prepareBasicKeyInputHandler();
    prepareCursorOperationHandler();

    
    function prepareBasicKeyInputHandler(){
      for(var code=32;code <= 126; code++){
        var char = String.fromCharCode(code);
        console.log(char);
        var handler = generateKeyInputHandler(char);
        keyEventMap[char] = handler;
        keyEventMap['S-' + char] = handler;
      }
      keyEventMap['Enter'] = generateKeyInputHandler(buffer.lineDelimiter || '\n');
      keyEventMap['Backspace'] = backspace;
    }

    function generateKeyInputHandler(char){
      return function(opt){
        console.log('#' + char + '#');
        var buffer = opt.buffer;
        buffer.insertChar(char);
      };
    }

    function backspace(opt){
      var buffer = opt.buffer;
      buffer.backspace();
    }

    function prepareCursorOperationHandler(){
      keyEventMap['Left'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorHorizontally(-1);
      };
      keyEventMap['Right'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorHorizontally(+1);
      };
      keyEventMap['Up'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorVertically(-1);
      };
      keyEventMap['Down'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorVertically(+1);
      };
    }
    
  }



  function Buffer(){
  };
  Buffer.prototype.insertChar = function(c){
    var mark = (c == (this.lineDelimiter || '\n')) ? ' lineEnd' : '';
    $c.before('<div class="char' + mark + '">' + (c == ' ' ? '&nbsp;' : c) + '</div>');
  };
  Buffer.prototype.backspace = function(){
    if($c.prev()[0] != BOF){
      $c.prev().remove();
    }
  };
  Buffer.prototype.moveCursorHorizontally = function(n){
    if(n<0){
      if($c.prev()[0] != BOF){
        $c.prev().before($c);
      }
    } else if(n>0){
      if($c.next()[0] != EOF){
        $c.next().after($c);
      }
    }
  };
  Buffer.prototype.moveCursorVertically = function(n){
    // implement me
  };
  Buffer.prototype.lineDelimiter = '\n';


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
    console.log("code:" + code);
    var char = String.fromCharCode(code);
    if(32 <= code && code <= 126){
      ret = char;
    } else {
      ret = vkCodeMap[code];
    }
    return ret;
  }   
});
